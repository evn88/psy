import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  BACKUP_ARCHIVE_CONTENT_TYPE,
  BACKUP_MANIFEST_VERSION,
  BACKUP_UPLOAD_PREFIX
} from '@/lib/config/backup';
import {
  addBufferArchiveEntry,
  createTarGzArchive,
  extractTarGzArchive,
  finalizeTarArchive
} from './archive';
import { deleteBackupBlobs, getBackupBlobStream, putBackupBlobStream } from './blob';
import {
  countBackupTableRows,
  dumpBackupTableRows,
  loadBackupDatabaseManifest,
  restoreBackupTableRows,
  truncateBackupTables,
  validateBackupManifestAgainstDatabase,
  withBackupDatabaseClient,
  withBackupDatabaseSnapshot,
  withBackupRestoreTransaction,
  type DatabaseClient
} from './database';
import type {
  BackupArchiveResult,
  BackupArchiveTableRecord,
  BackupProgressReporter,
  DatabaseBackupArchiveManifest,
  RestoreSiteBackupInput
} from './types';
import {
  createArchivePathname,
  createBackupArchiveFileName,
  readNodeStreamToBuffer
} from './utils';
import {
  getDatabaseTableEntryName,
  parseDatabaseBackupArchiveManifest,
  parseDatabaseTableRowsDocument,
  validateDatabaseTableRowsDocument
} from './validation';

const MANIFEST_ENTRY_NAME = 'manifest.json';

type CreateBackupArchiveOptions = {
  assertCanContinue?: () => Promise<void>;
};

/**
 * Масштабирует локальный прогресс операции в общий диапазон.
 * @param start - нижняя граница диапазона.
 * @param end - верхняя граница диапазона.
 * @param progress - локальный прогресс от 0 до 100.
 * @returns Прогресс в общем диапазоне.
 */
const mapProgressRange = (start: number, end: number, progress: number): number => {
  return start + ((end - start) * progress) / 100;
};

/**
 * Загружает список таблиц и число строк для архива БД.
 * @param client - закреплённое подключение PostgreSQL.
 * @param report - репортёр прогресса.
 * @param options - дополнительные параметры создания.
 * @returns Список таблиц БД.
 */
const loadDatabaseArchiveTables = async (
  client: DatabaseClient,
  report: BackupProgressReporter,
  options: CreateBackupArchiveOptions = {}
): Promise<BackupArchiveTableRecord[]> => {
  const { assertCanContinue } = options;

  await assertCanContinue?.();
  await report({
    phase: 'database',
    message: 'Читается структура БД для резервной копии.',
    progress: 3
  });

  const tables = await loadBackupDatabaseManifest(client);
  const result: BackupArchiveTableRecord[] = [];

  for (const [index, table] of tables.entries()) {
    await assertCanContinue?.();

    const rowCount = await countBackupTableRows(client, table.name);
    result.push({
      ...table,
      rowCount
    });

    await report({
      phase: 'database',
      message: `Подсчитаны строки таблицы ${table.name}.`,
      progress: mapProgressRange(3, 12, ((index + 1) / Math.max(tables.length, 1)) * 100)
    });
  }

  return result;
};

/**
 * Создаёт manifest архива БД.
 * @param archiveKind - тип архива.
 * @param tables - таблицы БД.
 * @returns manifest архива БД.
 */
const buildDatabaseArchiveManifest = (
  archiveKind: 'manual' | 'shadow',
  tables: BackupArchiveTableRecord[]
): DatabaseBackupArchiveManifest => {
  return {
    version: BACKUP_MANIFEST_VERSION,
    createdAt: new Date().toISOString(),
    archiveKind,
    artifact: 'database',
    database: {
      tableCount: tables.length,
      tables
    }
  };
};

/**
 * Создаёт tar.gz архив БД.
 * @param archiveKind - тип архива.
 * @param report - репортёр прогресса.
 * @param options - дополнительные параметры создания.
 * @returns Результат созданного архива БД.
 */
export const createDatabaseBackupArchive = async (
  archiveKind: 'manual' | 'shadow',
  report: BackupProgressReporter,
  options: CreateBackupArchiveOptions = {}
): Promise<BackupArchiveResult<DatabaseBackupArchiveManifest>> => {
  const { assertCanContinue } = options;

  await assertCanContinue?.();
  const fileName = createBackupArchiveFileName(archiveKind);
  const archivePathname = createArchivePathname(archiveKind, fileName);
  const { pack, stream } = createTarGzArchive();
  let manifest: DatabaseBackupArchiveManifest | null = null;

  await report({
    phase: 'archive',
    message: 'Собирается архив БД.',
    progress: 20
  });

  const uploadPromise = putBackupBlobStream(
    'private',
    archivePathname,
    stream,
    BACKUP_ARCHIVE_CONTENT_TYPE
  );

  try {
    await withBackupDatabaseClient(async client => {
      await withBackupDatabaseSnapshot(client, async () => {
        const tables = await loadDatabaseArchiveTables(client, report, options);
        manifest = parseDatabaseBackupArchiveManifest(
          buildDatabaseArchiveManifest(archiveKind, tables)
        );

        await addBufferArchiveEntry(
          pack,
          MANIFEST_ENTRY_NAME,
          Buffer.from(JSON.stringify(manifest), 'utf8')
        );

        for (const [index, table] of manifest.database.tables.entries()) {
          await assertCanContinue?.();

          const document = await dumpBackupTableRows(client, table);
          if (document.rows.length !== table.rowCount) {
            throw new Error(
              `Snapshot таблицы ${table.name} изменился во время backup: ожидалось ${table.rowCount}, получено ${document.rows.length}.`
            );
          }

          await addBufferArchiveEntry(
            pack,
            getDatabaseTableEntryName(table),
            Buffer.from(JSON.stringify(document), 'utf8')
          );

          await report({
            phase: 'database',
            message: `Сериализована таблица ${table.name} (${document.rows.length} строк).`,
            progress: mapProgressRange(
              20,
              88,
              ((index + 1) / Math.max(manifest.database.tableCount, 1)) * 100
            )
          });
        }
      });
    });

    if (!manifest) {
      throw new Error('Не удалось сформировать manifest архива БД.');
    }

    await assertCanContinue?.();
    await report({
      phase: 'upload',
      message: 'Архив БД финализируется и загружается в private blob.',
      progress: 92
    });

    finalizeTarArchive(pack);
    const uploaded = await uploadPromise;

    await assertCanContinue?.();
    await report({
      phase: 'done',
      message: 'Архив БД успешно создан.',
      progress: 100
    });

    return {
      artifact: 'database',
      manifest,
      pathname: archivePathname,
      fileName,
      url: uploaded.url
    };
  } catch (error) {
    pack.destroy(error instanceof Error ? error : new Error(String(error)));
    await uploadPromise.catch(() => undefined);
    throw error;
  }
};

type PreparedDatabaseRestoreArchive = {
  temporaryDirectory: string;
  manifest: DatabaseBackupArchiveManifest;
  tableEntryPaths: Map<string, string>;
};

/**
 * Полностью распаковывает и валидирует архив до начала транзакции восстановления.
 * В памяти одновременно удерживается только один table entry.
 * @param source - поток tar.gz.
 * @returns Проверенный manifest и пути временных table entry.
 */
const prepareDatabaseRestoreArchive = async (
  source: NodeJS.ReadableStream
): Promise<PreparedDatabaseRestoreArchive> => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'vershkov-database-restore-'));
  const seenEntryNames = new Set<string>();
  const entryPaths = new Map<string, string>();
  let entryIndex = 0;

  try {
    await extractTarGzArchive(source, async entry => {
      if (seenEntryNames.has(entry.name)) {
        throw new Error(`Архив БД содержит дубликат entry ${entry.name}.`);
      }

      seenEntryNames.add(entry.name);

      const entryBuffer = await readNodeStreamToBuffer(entry.stream);
      const entryPath = path.join(
        temporaryDirectory,
        `archive-entry-${entryIndex.toString().padStart(6, '0')}.json`
      );
      entryIndex += 1;
      await writeFile(entryPath, entryBuffer);
      entryPaths.set(entry.name, entryPath);
    });

    const manifestPath = entryPaths.get(MANIFEST_ENTRY_NAME);

    if (!manifestPath) {
      throw new Error('Архив БД не содержит manifest.json.');
    }

    const manifestBuffer = await readFile(manifestPath);
    const manifest = parseDatabaseBackupArchiveManifest(
      JSON.parse(manifestBuffer.toString('utf8')) as unknown
    );
    const tableEntryPaths = new Map(
      Array.from(entryPaths.entries()).filter(([entryName]) => entryName !== MANIFEST_ENTRY_NAME)
    );
    const expectedEntries = new Map(
      manifest.database.tables.map(table => [getDatabaseTableEntryName(table), table])
    );

    for (const entryName of tableEntryPaths.keys()) {
      if (!expectedEntries.has(entryName)) {
        throw new Error(`Архив БД содержит неожиданный entry ${entryName}.`);
      }
    }

    for (const [entryName, table] of expectedEntries.entries()) {
      const entryPath = tableEntryPaths.get(entryName);

      if (!entryPath) {
        throw new Error(`Архив БД не содержит данные таблицы ${table.name}.`);
      }

      const documentBuffer = await readFile(entryPath);
      const document = parseDatabaseTableRowsDocument(
        JSON.parse(documentBuffer.toString('utf8')) as unknown
      );
      validateDatabaseTableRowsDocument(document, table);
    }

    if (tableEntryPaths.size !== manifest.database.tableCount) {
      throw new Error(
        `Архив БД содержит ${tableEntryPaths.size} table entry вместо ${manifest.database.tableCount}.`
      );
    }

    return {
      temporaryDirectory,
      manifest,
      tableEntryPaths
    };
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
};

/**
 * Восстанавливает БД из отдельного архива.
 * @param input - входные данные архива БД.
 * @param report - репортёр прогресса.
 */
const restoreDatabaseBackupArchive = async (
  input: RestoreSiteBackupInput,
  report: BackupProgressReporter
): Promise<void> => {
  const archiveBlob = await getBackupBlobStream('private', input.databaseArchivePathname);
  const preparedArchive = await prepareDatabaseRestoreArchive(archiveBlob.stream);

  try {
    await withBackupDatabaseClient(async client => {
      await withBackupRestoreTransaction(client, async () => {
        await validateBackupManifestAgainstDatabase(
          client,
          preparedArchive.manifest.database.tables
        );

        await report({
          phase: 'restore',
          message: 'Manifest и содержимое архива БД проверены. Начинается восстановление таблиц.',
          progress: 40
        });

        await truncateBackupTables(client, preparedArchive.manifest.database.tables);

        await report({
          phase: 'database',
          message: 'Текущие таблицы очищены. Начинается запись данных из архива БД.',
          progress: 46
        });

        for (const [index, table] of preparedArchive.manifest.database.tables.entries()) {
          const entryPath = preparedArchive.tableEntryPaths.get(getDatabaseTableEntryName(table));

          if (!entryPath) {
            throw new Error(`Не найден проверенный entry таблицы ${table.name}.`);
          }

          const documentBuffer = await readFile(entryPath);
          const document = parseDatabaseTableRowsDocument(
            JSON.parse(documentBuffer.toString('utf8')) as unknown
          );
          validateDatabaseTableRowsDocument(document, table);
          await restoreBackupTableRows(client, table, document.rows, new Map());

          await report({
            phase: 'database',
            message: `Восстановлена таблица ${document.table} (${document.rows.length} строк).`,
            progress: mapProgressRange(
              46,
              96,
              ((index + 1) / Math.max(preparedArchive.manifest.database.tableCount, 1)) * 100
            )
          });
        }
      });
    });
  } finally {
    await rm(preparedArchive.temporaryDirectory, { recursive: true, force: true }).catch(
      () => undefined
    );
  }

  if (input.databaseArchivePathname.startsWith(`${BACKUP_UPLOAD_PREFIX}/`)) {
    await deleteBackupBlobs('private', [input.databaseArchivePathname]);
  }
};

/**
 * Восстанавливает БД из архива и создаёт теневую копию перед записью.
 * @param input - путь до загруженного архива БД.
 * @param report - репортёр прогресса.
 * @param onShadowBackupCreated - колбэк после создания теневой копии.
 * @returns Данные созданной теневой копии.
 */
export const restoreSiteBackupArchives = async (
  input: RestoreSiteBackupInput,
  report: BackupProgressReporter,
  onShadowBackupCreated?: (artifacts: {
    databaseShadowBackup: BackupArchiveResult<DatabaseBackupArchiveManifest>;
  }) => Promise<void>
): Promise<{
  databaseShadowBackup: BackupArchiveResult<DatabaseBackupArchiveManifest>;
}> => {
  await report({
    phase: 'shadow',
    message: 'Создаётся теневая копия БД перед восстановлением.',
    progress: 2
  });

  const databaseShadowBackup = await createDatabaseBackupArchive('shadow', async progressInput => {
    await report({
      phase: progressInput.phase === 'done' ? 'shadow' : progressInput.phase,
      message: progressInput.message,
      progress: mapProgressRange(2, 28, progressInput.progress)
    });
  });

  if (onShadowBackupCreated) {
    await onShadowBackupCreated({
      databaseShadowBackup
    });
  }

  await report({
    phase: 'restore',
    message: 'Начинается восстановление БД из архива.',
    progress: 34
  });

  await restoreDatabaseBackupArchive(input, async progressInput => {
    await report({
      phase: progressInput.phase,
      message: progressInput.message,
      progress: mapProgressRange(34, 96, progressInput.progress)
    });
  });

  await report({
    phase: 'done',
    message: 'Восстановление БД из архива завершено.',
    progress: 100
  });

  return {
    databaseShadowBackup
  };
};
