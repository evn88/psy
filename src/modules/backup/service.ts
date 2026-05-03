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
  withBackupDatabaseClient
} from './database';
import type {
  BackupArchiveResult,
  BackupArchiveTableRecord,
  BackupProgressReporter,
  DatabaseBackupArchiveManifest,
  DatabaseTableRowsDocument,
  RestoreSiteBackupInput
} from './types';
import {
  createArchivePathname,
  createBackupArchiveFileName,
  readNodeStreamToBuffer
} from './utils';

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
 * @param report - репортёр прогресса.
 * @param options - дополнительные параметры создания.
 * @returns Список таблиц БД.
 */
const loadDatabaseArchiveTables = async (
  report: BackupProgressReporter,
  options: CreateBackupArchiveOptions = {}
): Promise<BackupArchiveTableRecord[]> => {
  const { assertCanContinue } = options;

  return withBackupDatabaseClient(async client => {
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
        progress: mapProgressRange(3, 12, ((index + 1) / tables.length) * 100)
      });
    }

    return result;
  });
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
  const tables = await loadDatabaseArchiveTables(report, options);
  const manifest = buildDatabaseArchiveManifest(archiveKind, tables);
  const fileName = createBackupArchiveFileName(archiveKind);
  const archivePathname = createArchivePathname(archiveKind, fileName);
  const { pack, stream } = createTarGzArchive();

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

  await addBufferArchiveEntry(
    pack,
    MANIFEST_ENTRY_NAME,
    Buffer.from(JSON.stringify(manifest), 'utf8')
  );

  await withBackupDatabaseClient(async client => {
    for (const [index, table] of manifest.database.tables.entries()) {
      await assertCanContinue?.();

      const document = await dumpBackupTableRows(client, table);
      const entryName = `database/tables/${table.order.toString().padStart(3, '0')}-${table.name}.json`;

      await addBufferArchiveEntry(pack, entryName, Buffer.from(JSON.stringify(document), 'utf8'));

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

  await withBackupDatabaseClient(async client => {
    let manifest: DatabaseBackupArchiveManifest | null = null;
    let databasePrepared = false;
    let completedTableItems = 0;

    await extractTarGzArchive(archiveBlob.stream, async entry => {
      if (entry.name === MANIFEST_ENTRY_NAME) {
        const manifestBuffer = await readNodeStreamToBuffer(entry.stream);
        const parsedManifest = JSON.parse(
          manifestBuffer.toString('utf8')
        ) as DatabaseBackupArchiveManifest;

        if (parsedManifest.version !== BACKUP_MANIFEST_VERSION) {
          throw new Error(
            `Неподдерживаемая версия архива БД: ${parsedManifest.version}. Ожидалась ${BACKUP_MANIFEST_VERSION}.`
          );
        }

        if (parsedManifest.artifact !== 'database') {
          throw new Error('Загруженный архив не является архивом БД.');
        }

        manifest = parsedManifest;
        await validateBackupManifestAgainstDatabase(client, parsedManifest.database.tables);

        await report({
          phase: 'restore',
          message: 'Manifest архива БД проверен. Начинается восстановление таблиц.',
          progress: 40
        });

        return;
      }

      if (!manifest) {
        throw new Error('Архив БД повреждён: manifest.json должен быть первым файлом.');
      }

      if (!entry.name.startsWith('database/tables/')) {
        entry.stream.resume();
        return;
      }

      if (!databasePrepared) {
        await truncateBackupTables(client, manifest.database.tables);
        databasePrepared = true;

        await report({
          phase: 'database',
          message: 'Текущие таблицы очищены. Начинается запись данных из архива БД.',
          progress: 46
        });
      }

      const documentBuffer = await readNodeStreamToBuffer(entry.stream);
      const document = JSON.parse(documentBuffer.toString('utf8')) as DatabaseTableRowsDocument;
      const table = manifest.database.tables.find(item => item.name === document.table);

      if (!table) {
        throw new Error(`Таблица ${document.table} отсутствует в manifest архива БД.`);
      }

      await restoreBackupTableRows(client, table, document.rows, new Map());
      completedTableItems += 1;

      await report({
        phase: 'database',
        message: `Восстановлена таблица ${document.table} (${document.rows.length} строк).`,
        progress: mapProgressRange(
          46,
          96,
          (completedTableItems / Math.max(manifest.database.tableCount, 1)) * 100
        )
      });
    });

    if (!manifest) {
      throw new Error('Архив БД не содержит manifest.json.');
    }
  });

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
