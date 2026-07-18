import { z } from 'zod';
import { BACKUP_MANIFEST_VERSION } from '@/lib/config/backup';
import { isBackupExcludedTableName } from './table-policy';
import type {
  BackupArchiveTableRecord,
  DatabaseBackupArchiveManifest,
  DatabaseTableRowsDocument
} from './types';

const tableColumnSchema = z
  .object({
    name: z.string().min(1),
    dataType: z.string().min(1),
    udtName: z.string().min(1),
    isNullable: z.boolean(),
    ordinalPosition: z.number().int().positive()
  })
  .strict();

const tableRecordSchema = z
  .object({
    name: z.string().min(1),
    order: z.number().int().nonnegative(),
    rowCount: z.number().int().nonnegative(),
    primaryKey: z.array(z.string().min(1)),
    dependsOn: z.array(z.string().min(1)),
    columns: z.array(tableColumnSchema).min(1)
  })
  .strict();

const databaseManifestSchema = z
  .object({
    version: z.literal(BACKUP_MANIFEST_VERSION),
    createdAt: z.string().min(1),
    archiveKind: z.enum(['manual', 'shadow']),
    artifact: z.literal('database'),
    database: z
      .object({
        tableCount: z.number().int().nonnegative(),
        tables: z.array(tableRecordSchema)
      })
      .strict()
  })
  .strict();

const tableRowsDocumentSchema = z
  .object({
    table: z.string().min(1),
    rows: z.array(z.record(z.string(), z.unknown()))
  })
  .strict();

const formatValidationIssues = (error: z.ZodError): string => {
  return error.issues
    .map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ');
};

/**
 * Возвращает ожидаемое имя entry с данными таблицы.
 * @param table - запись manifest.
 * @returns Имя файла внутри tar.
 */
export const getDatabaseTableEntryName = (table: BackupArchiveTableRecord): string => {
  return `database/tables/${table.order.toString().padStart(3, '0')}-${table.name}.json`;
};

/**
 * Разбирает и проверяет manifest архива БД.
 * @param value - результат JSON.parse.
 * @returns Типобезопасный manifest.
 */
export const parseDatabaseBackupArchiveManifest = (
  value: unknown
): DatabaseBackupArchiveManifest => {
  const parsed = databaseManifestSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(
      `Manifest архива БД имеет неверный формат: ${formatValidationIssues(parsed.error)}`
    );
  }

  if (Number.isNaN(Date.parse(parsed.data.createdAt))) {
    throw new Error('Manifest архива БД содержит некорректную дату создания.');
  }

  if (parsed.data.database.tableCount !== parsed.data.database.tables.length) {
    throw new Error(
      `Manifest архива БД содержит tableCount=${parsed.data.database.tableCount}, но описывает ${parsed.data.database.tables.length} таблиц.`
    );
  }

  const tableNames = new Set<string>();
  const tableOrders = new Set<number>();

  for (const [tableIndex, table] of parsed.data.database.tables.entries()) {
    if (/[/\\\0]/.test(table.name) || isBackupExcludedTableName(table.name)) {
      throw new Error(`Manifest архива БД содержит недопустимую таблицу ${table.name}.`);
    }

    if (tableNames.has(table.name)) {
      throw new Error(`Manifest архива БД содержит дубликат таблицы ${table.name}.`);
    }

    if (tableOrders.has(table.order)) {
      throw new Error(`Manifest архива БД содержит дубликат порядка ${table.order}.`);
    }

    if (table.order !== tableIndex) {
      throw new Error(
        `Manifest архива БД содержит некорректный порядок таблицы ${table.name}: ожидался ${tableIndex}, получен ${table.order}.`
      );
    }

    tableNames.add(table.name);
    tableOrders.add(table.order);

    const columnNames = new Set<string>();
    for (const [columnIndex, column] of table.columns.entries()) {
      if (columnNames.has(column.name)) {
        throw new Error(
          `Manifest архива БД содержит дубликат колонки ${column.name} в таблице ${table.name}.`
        );
      }

      if (column.ordinalPosition !== columnIndex + 1) {
        throw new Error(
          `Manifest архива БД содержит некорректную позицию колонки ${column.name} в таблице ${table.name}.`
        );
      }

      columnNames.add(column.name);
    }

    const primaryKey = new Set(table.primaryKey);
    if (primaryKey.size !== table.primaryKey.length) {
      throw new Error(`Manifest архива БД содержит дубликаты в PK таблицы ${table.name}.`);
    }

    for (const primaryKeyColumn of primaryKey) {
      if (!columnNames.has(primaryKeyColumn)) {
        throw new Error(
          `Manifest архива БД ссылается на отсутствующую PK-колонку ${primaryKeyColumn} таблицы ${table.name}.`
        );
      }
    }

    if (new Set(table.dependsOn).size !== table.dependsOn.length) {
      throw new Error(`Manifest архива БД содержит дубликаты зависимостей таблицы ${table.name}.`);
    }
  }

  for (const table of parsed.data.database.tables) {
    for (const dependency of table.dependsOn) {
      if (!tableNames.has(dependency)) {
        throw new Error(
          `Manifest архива БД содержит некорректную зависимость ${table.name} -> ${dependency}.`
        );
      }
    }
  }

  return parsed.data;
};

/**
 * Разбирает документ строк одной таблицы.
 * @param value - результат JSON.parse.
 * @returns Типобезопасный документ.
 */
export const parseDatabaseTableRowsDocument = (value: unknown): DatabaseTableRowsDocument => {
  const parsed = tableRowsDocumentSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(
      `Документ строк таблицы имеет неверный формат: ${formatValidationIssues(parsed.error)}`
    );
  }

  return parsed.data;
};

/**
 * Проверяет согласованность документа строк с manifest.
 * @param document - документ строк.
 * @param table - соответствующая запись manifest.
 */
export const validateDatabaseTableRowsDocument = (
  document: DatabaseTableRowsDocument,
  table: BackupArchiveTableRecord
): void => {
  if (document.table !== table.name) {
    throw new Error(
      `Entry таблицы ${table.name} содержит данные другой таблицы: ${document.table}.`
    );
  }

  if (document.rows.length !== table.rowCount) {
    throw new Error(
      `Количество строк таблицы ${table.name} не совпадает с manifest: ожидалось ${table.rowCount}, получено ${document.rows.length}.`
    );
  }

  const expectedColumns = [...table.columns.map(column => column.name)].sort();

  for (const [rowIndex, row] of document.rows.entries()) {
    const actualColumns = Object.keys(row).sort();

    if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) {
      throw new Error(
        `Строка ${rowIndex} таблицы ${table.name} не соответствует колонкам manifest.`
      );
    }
  }
};
