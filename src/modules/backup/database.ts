import { Pool, type QueryResultRow } from 'pg';
import type {
  BackupArchiveTableColumn,
  BackupArchiveTableRecord,
  DatabaseTableRowsDocument
} from './types';
import { escapeSqlIdentifier, replaceBlobUrlsDeep } from './utils';

type DatabaseClient = Pick<Pool, 'query'>;

type ForeignKeyDependencyRow = QueryResultRow & {
  tableName: string;
  referencedTableName: string;
};

type ColumnMetadataRow = QueryResultRow & {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  ordinalPosition: number;
};

type PrimaryKeyRow = QueryResultRow & {
  columnName: string;
};

const DATABASE_URL_CANDIDATES = [
  'DIRECT_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL',
  'DATABASE_URL'
] as const;

/**
 * Возвращает URL прямого подключения к PostgreSQL для бэкапа.
 * @returns Строка подключения.
 */
const getBackupDatabaseUrl = (): string => {
  const candidates = DATABASE_URL_CANDIDATES.map(name => process.env[name]).filter(
    (value): value is string => Boolean(value)
  );

  const directUrl = candidates.find(
    value => !value.startsWith('prisma://') && !value.startsWith('prisma+postgres://')
  );

  if (!directUrl) {
    throw new Error(
      'Для резервного копирования нужен прямой PostgreSQL URL. Задайте DIRECT_DATABASE_URL или POSTGRES_URL_NON_POOLING.'
    );
  }

  return directUrl.replace(/([?&])sslmode=[^&]+&?/, '$1').replace(/[?&]$/, '');
};

/**
 * Выполняет функцию с raw PostgreSQL клиентом.
 * @param run - пользовательская операция.
 * @returns Результат `run`.
 */
export const withBackupDatabaseClient = async <T>(
  run: (client: DatabaseClient) => Promise<T>
): Promise<T> => {
  const pool = new Pool({
    connectionString: getBackupDatabaseUrl(),
    ssl: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : true
  });

  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
};

/**
 * Загружает список зависимостей между таблицами по внешним ключам.
 * @param client - raw PostgreSQL клиент.
 * @returns Отображение зависимостей.
 */
const loadForeignKeyDependencies = async (
  client: DatabaseClient
): Promise<Map<string, Set<string>>> => {
  const result = await client.query<ForeignKeyDependencyRow>(`
    SELECT
      tc.table_name AS "tableName",
      ccu.table_name AS "referencedTableName"
    FROM information_schema.table_constraints tc
    INNER JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
  `);

  return result.rows.reduce<Map<string, Set<string>>>((accumulator, row) => {
    const tableDependencies = accumulator.get(row.tableName) ?? new Set<string>();
    tableDependencies.add(row.referencedTableName);
    accumulator.set(row.tableName, tableDependencies);
    return accumulator;
  }, new Map<string, Set<string>>());
};

/**
 * Загружает метаданные колонок таблицы.
 * @param client - raw PostgreSQL клиент.
 * @param tableName - имя таблицы.
 * @returns Упорядоченный список колонок.
 */
const loadTableColumns = async (
  client: DatabaseClient,
  tableName: string
): Promise<BackupArchiveTableColumn[]> => {
  const result = await client.query<ColumnMetadataRow>(
    `
      SELECT
        column_name AS "name",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable = 'YES' AS "isNullable",
        ordinal_position AS "ordinalPosition"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position ASC
    `,
    [tableName]
  );

  return result.rows;
};

/**
 * Загружает список колонок первичного ключа.
 * @param client - raw PostgreSQL клиент.
 * @param tableName - имя таблицы.
 * @returns Список колонок PK в порядке объявления.
 */
const loadPrimaryKeyColumns = async (
  client: DatabaseClient,
  tableName: string
): Promise<string[]> => {
  const result = await client.query<PrimaryKeyRow>(
    `
      SELECT
        kcu.column_name AS "columnName"
      FROM information_schema.table_constraints tc
      INNER JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position ASC
    `,
    [tableName]
  );

  return result.rows.map(row => row.columnName);
};

/**
 * Выполняет топологическую сортировку таблиц для корректного restore.
 * @param tableNames - список таблиц.
 * @param dependencies - зависимости по внешним ключам.
 * @returns Список таблиц в безопасном порядке вставки.
 */
const sortTablesForRestore = (
  tableNames: string[],
  dependencies: Map<string, Set<string>>
): string[] => {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();

  for (const tableName of tableNames) {
    incoming.set(tableName, new Set(dependencies.get(tableName) ?? []));
    outgoing.set(tableName, new Set<string>());
  }

  for (const [tableName, dependencySet] of incoming.entries()) {
    for (const dependency of dependencySet) {
      if (!outgoing.has(dependency)) {
        continue;
      }

      outgoing.get(dependency)?.add(tableName);
    }
  }

  const queue = Array.from(incoming.entries())
    .filter(([, values]) => values.size === 0)
    .map(([tableName]) => tableName)
    .sort((left, right) => left.localeCompare(right));

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    sorted.push(current);

    const dependants = Array.from(outgoing.get(current) ?? []).sort((left, right) =>
      left.localeCompare(right)
    );

    for (const dependant of dependants) {
      const dependencySet = incoming.get(dependant);
      if (!dependencySet) {
        continue;
      }

      dependencySet.delete(current);
      if (dependencySet.size === 0) {
        queue.push(dependant);
        queue.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  if (sorted.length === tableNames.length) {
    return sorted;
  }

  const unresolved = tableNames.filter(tableName => !sorted.includes(tableName)).sort();
  return [...sorted, ...unresolved];
};

/**
 * Загружает полное описание таблиц public schema.
 * @param client - raw PostgreSQL клиент.
 * @returns Метаданные таблиц в порядке безопасного восстановления.
 */
export const loadBackupDatabaseManifest = async (
  client: DatabaseClient
): Promise<BackupArchiveTableRecord[]> => {
  const tableResult = await client.query<{ tableName: string }>(`
    SELECT tablename AS "tableName"
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  const tableNames = tableResult.rows.map(row => row.tableName);
  const dependencies = await loadForeignKeyDependencies(client);
  const orderedTableNames = sortTablesForRestore(tableNames, dependencies);

  const tables = await Promise.all(
    orderedTableNames.map(async (tableName, index) => {
      const [columns, primaryKey] = await Promise.all([
        loadTableColumns(client, tableName),
        loadPrimaryKeyColumns(client, tableName)
      ]);

      return {
        name: tableName,
        order: index,
        rowCount: 0,
        primaryKey,
        dependsOn: Array.from(dependencies.get(tableName) ?? []).sort((left, right) =>
          left.localeCompare(right)
        ),
        columns
      } satisfies BackupArchiveTableRecord;
    })
  );

  return tables;
};

/**
 * Загружает все строки указанной таблицы.
 * @param client - raw PostgreSQL клиент.
 * @param table - описание таблицы.
 * @returns Документ строк таблицы для сериализации в архив.
 */
export const dumpBackupTableRows = async (
  client: DatabaseClient,
  table: BackupArchiveTableRecord
): Promise<DatabaseTableRowsDocument> => {
  const orderBySql =
    table.primaryKey.length > 0
      ? ` ORDER BY ${table.primaryKey.map(column => escapeSqlIdentifier(column)).join(', ')}`
      : '';

  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM ${escapeSqlIdentifier(table.name)}${orderBySql}`
  );

  return {
    table: table.name,
    rows: result.rows
  };
};

/**
 * Возвращает количество строк в таблице.
 * @param client - raw PostgreSQL клиент.
 * @param tableName - имя таблицы.
 * @returns Количество строк.
 */
export const countBackupTableRows = async (
  client: DatabaseClient,
  tableName: string
): Promise<number> => {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS "count" FROM ${escapeSqlIdentifier(tableName)}`
  );

  return Number(result.rows[0]?.count ?? 0);
};

/**
 * Проверяет совместимость текущей схемы БД с архивом.
 * @param client - raw PostgreSQL клиент.
 * @param manifestTables - таблицы из архива.
 */
export const validateBackupManifestAgainstDatabase = async (
  client: DatabaseClient,
  manifestTables: BackupArchiveTableRecord[]
): Promise<void> => {
  const currentTables = await loadBackupDatabaseManifest(client);
  const currentByName = new Map(currentTables.map(table => [table.name, table]));

  for (const archivedTable of manifestTables) {
    const currentTable = currentByName.get(archivedTable.name);

    if (!currentTable) {
      throw new Error(`Таблица ${archivedTable.name} отсутствует в текущей БД.`);
    }

    const currentColumns = currentTable.columns.map(column => column.name).join('|');
    const archivedColumns = archivedTable.columns.map(column => column.name).join('|');

    if (currentColumns !== archivedColumns) {
      throw new Error(`Структура таблицы ${archivedTable.name} не совпадает с архивом.`);
    }
  }
};

/**
 * Очищает все public таблицы перед восстановлением.
 * @param client - raw PostgreSQL клиент.
 * @param tables - список таблиц из manifest.
 */
export const truncateBackupTables = async (
  client: DatabaseClient,
  tables: BackupArchiveTableRecord[]
): Promise<void> => {
  if (tables.length === 0) {
    return;
  }

  const tableSql = tables.map(table => escapeSqlIdentifier(table.name)).join(', ');
  await client.query(`TRUNCATE TABLE ${tableSql} CASCADE`);
};

/**
 * Преобразует JSON-значение архива обратно в тип, пригодный для pg параметров.
 * @param value - JSON-значение.
 * @param column - описание колонки.
 * @returns Значение для INSERT.
 */
const reviveColumnValue = (value: unknown, column: BackupArchiveTableColumn): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  if (
    column.dataType === 'date' ||
    column.dataType.startsWith('timestamp') ||
    column.dataType === 'time without time zone' ||
    column.dataType === 'time with time zone'
  ) {
    return new Date(value);
  }

  return value;
};

/**
 * Вставляет строки одной таблицы пакетами.
 * @param client - raw PostgreSQL клиент.
 * @param table - описание таблицы.
 * @param rows - строки из архива.
 * @param blobUrlMap - отображение старых blob URL в новые.
 */
export const restoreBackupTableRows = async (
  client: DatabaseClient,
  table: BackupArchiveTableRecord,
  rows: Array<Record<string, unknown>>,
  blobUrlMap: ReadonlyMap<string, string>
): Promise<void> => {
  if (rows.length === 0) {
    return;
  }

  const columns = table.columns.map(column => column.name);
  const columnMap = new Map(table.columns.map(column => [column.name, column]));
  const batchSize = 100;

  for (let batchStart = 0; batchStart < rows.length; batchStart += batchSize) {
    const batch = rows.slice(batchStart, batchStart + batchSize);
    const values: unknown[] = [];

    const placeholderSql = batch
      .map(row => {
        const transformedRow = replaceBlobUrlsDeep(row, blobUrlMap) as Record<string, unknown>;

        const rowPlaceholders = columns.map(columnName => {
          const column = columnMap.get(columnName);

          if (!column) {
            throw new Error(`Не найдена колонка ${columnName} для таблицы ${table.name}.`);
          }

          values.push(reviveColumnValue(transformedRow[columnName] ?? null, column));
          return `$${values.length}`;
        });

        return `(${rowPlaceholders.join(', ')})`;
      })
      .join(', ');

    await client.query(
      `INSERT INTO ${escapeSqlIdentifier(table.name)} (${columns
        .map(columnName => escapeSqlIdentifier(columnName))
        .join(', ')}) VALUES ${placeholderSql}`,
      values
    );
  }
};
