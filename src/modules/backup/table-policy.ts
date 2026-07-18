const BACKUP_EXCLUDED_TABLE_NAMES = new Set([
  '_prisma_migrations',
  'DatabaseIdentity',
  'spatial_ref_sys',
  'WorkflowLease'
]);
const BACKUP_EXCLUDED_TABLE_PREFIXES = ['pg_', 'sql_'] as const;

/**
 * Проверяет, относится ли таблица к системным или служебным данным БД.
 * @param tableName - имя таблицы.
 * @returns `true`, если таблица не должна попадать в пользовательский backup.
 */
export const isBackupExcludedTableName = (tableName: string): boolean => {
  return (
    BACKUP_EXCLUDED_TABLE_NAMES.has(tableName) ||
    BACKUP_EXCLUDED_TABLE_PREFIXES.some(prefix => tableName.startsWith(prefix))
  );
};
