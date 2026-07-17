import { describe, expect, it, vi } from 'vitest';
import type { BackupArchiveTableRecord } from '../types';
import {
  dumpBackupTableRows,
  loadBackupDatabaseManifest,
  restoreBackupTableRows,
  truncateBackupTables,
  withBackupDatabaseSnapshot,
  withBackupRestoreTransaction,
  type DatabaseClient
} from '../database';

describe('backup database helpers', () => {
  it('восстановление таблицы подставляет новые blob url и оживляет даты', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query };
    const table: BackupArchiveTableRecord = {
      name: 'blog_post',
      order: 0,
      rowCount: 1,
      primaryKey: ['id'],
      dependsOn: [],
      columns: [
        { name: 'id', dataType: 'text', udtName: 'text', isNullable: false, ordinalPosition: 1 },
        {
          name: 'coverImage',
          dataType: 'text',
          udtName: 'text',
          isNullable: true,
          ordinalPosition: 2
        },
        {
          name: 'publishedAt',
          dataType: 'timestamp with time zone',
          udtName: 'timestamptz',
          isNullable: true,
          ordinalPosition: 3
        }
      ]
    };
    const rows = [
      {
        id: 'post-1',
        coverImage: 'https://old.public/blob/cover.webp',
        publishedAt: '2026-04-09T10:00:00.000Z'
      }
    ];

    // Act
    await restoreBackupTableRows(
      client,
      table,
      rows,
      new Map([['https://old.public/blob/cover.webp', 'https://new.public/blob/cover.webp']])
    );

    // Assert
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO "blog_post"');
    expect(params[0]).toBe('post-1');
    expect(params[1]).toBe('https://new.public/blob/cover.webp');
    expect(params[2]).toBeInstanceOf(Date);
  });

  it('дамп таблицы использует сортировку по первичному ключу', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: 'user-1', email: 'test@example.com' }]
    });
    const client = { query };
    const table: BackupArchiveTableRecord = {
      name: 'user',
      order: 0,
      rowCount: 1,
      primaryKey: ['id'],
      dependsOn: [],
      columns: [
        { name: 'id', dataType: 'text', udtName: 'text', isNullable: false, ordinalPosition: 1 },
        {
          name: 'email',
          dataType: 'text',
          udtName: 'text',
          isNullable: false,
          ordinalPosition: 2
        }
      ]
    };

    // Act
    const document = await dumpBackupTableRows(client, table);

    // Assert
    expect(query).toHaveBeenCalledWith('SELECT * FROM "user" ORDER BY "id"');
    expect(document).toEqual({
      table: 'user',
      rows: [{ id: 'user-1', email: 'test@example.com' }]
    });
  });

  it('snapshot backup выполняется в read-only repeatable read транзакции', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query };

    // Act
    const result = await withBackupDatabaseSnapshot(client, async () => {
      await client.query('SELECT * FROM "User"');
      return 'snapshot-result';
    });

    // Assert
    expect(result).toBe('snapshot-result');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
      'SELECT * FROM "User"',
      'COMMIT'
    ]);
  });

  it('ошибка restore приводит к rollback транзакции', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query };

    // Act
    const restorePromise = withBackupRestoreTransaction(client, async () => {
      await client.query('TRUNCATE TABLE "User" CASCADE');
      throw new Error('insert failed');
    });

    // Assert
    await expect(restorePromise).rejects.toThrow('insert failed');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      'TRUNCATE TABLE "User" CASCADE',
      'ROLLBACK'
    ]);
  });

  it('очистка restore не затрагивает исключённые таблицы через cascade', async () => {
    // Arrange
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query };
    const table: BackupArchiveTableRecord = {
      name: 'User',
      order: 0,
      rowCount: 0,
      primaryKey: ['id'],
      dependsOn: [],
      columns: [
        { name: 'id', dataType: 'text', udtName: 'text', isNullable: false, ordinalPosition: 1 }
      ]
    };

    // Act
    await truncateBackupTables(client, [table]);

    // Assert
    expect(query).toHaveBeenCalledWith('TRUNCATE TABLE "User"');
  });

  it('manifest backup исключает таблицу миграций и системные таблицы', async () => {
    // Arrange
    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM pg_tables')) {
        return {
          rows: [
            { tableName: 'User' },
            { tableName: '_ApplicationRelation' },
            { tableName: '_prisma_migrations' },
            { tableName: 'DatabaseIdentity' },
            { tableName: 'pg_service_table' },
            { tableName: 'WorkflowLease' }
          ]
        };
      }

      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return { rows: [] };
      }

      if (sql.includes("constraint_type = 'PRIMARY KEY'")) {
        return {
          rows:
            params?.[0] === 'User' || params?.[0] === '_ApplicationRelation'
              ? [{ columnName: 'id' }]
              : []
        };
      }

      if (sql.includes('FROM information_schema.columns')) {
        return {
          rows:
            params?.[0] === 'User' || params?.[0] === '_ApplicationRelation'
              ? [
                  {
                    name: 'id',
                    dataType: 'text',
                    udtName: 'text',
                    isNullable: false,
                    ordinalPosition: 1
                  }
                ]
              : []
        };
      }

      return { rows: [] };
    });

    // Act
    const manifest = await loadBackupDatabaseManifest({
      query: query as unknown as DatabaseClient['query']
    });

    // Assert
    expect(manifest.map(table => table.name)).toEqual(['_ApplicationRelation', 'User']);
  });
});
