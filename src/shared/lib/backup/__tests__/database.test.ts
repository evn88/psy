import { describe, expect, it, vi } from 'vitest';
import type { BackupArchiveTableRecord } from '../types';
import { dumpBackupTableRows, restoreBackupTableRows } from '../database';

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
});
