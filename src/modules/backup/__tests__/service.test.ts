import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKUP_MANIFEST_VERSION } from '@/lib/config/backup';
import {
  addBufferArchiveEntry,
  createTarGzArchive,
  extractTarGzArchive,
  finalizeTarArchive
} from '../archive';
import { readNodeStreamToBuffer } from '../utils';
import type {
  BackupArchiveTableRecord,
  DatabaseBackupArchiveManifest,
  DatabaseTableRowsDocument
} from '../types';

type MockBlob = {
  pathname: string;
  url: string;
  contentType: string;
  buffer: Buffer;
  uploadedAt: Date;
};

const testState = vi.hoisted(() => {
  return {
    privateBlobs: new Map<string, MockBlob>(),
    tables: [] as BackupArchiveTableRecord[],
    rowsByTable: {} as Record<string, Array<Record<string, unknown>>>,
    truncateCalls: 0,
    snapshotTransactionCommands: [] as string[],
    restoreTransactionCommands: [] as string[],
    restoreFailureTable: null as string | null
  };
});

vi.mock('@/modules/backup/blob', () => {
  const readStream = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  };

  return {
    getBackupBlobStream: vi.fn(async (_store: 'private', pathname: string) => {
      const blob = testState.privateBlobs.get(pathname);

      if (!blob) {
        throw new Error(`Missing blob body for ${pathname}`);
      }

      return {
        stream: Readable.from(blob.buffer),
        size: blob.buffer.length,
        contentType: blob.contentType,
        url: blob.url
      };
    }),
    putBackupBlobStream: vi.fn(
      async (
        _store: 'private',
        pathname: string,
        body: NodeJS.ReadableStream,
        contentType: string
      ) => {
        const buffer = await readStream(body);
        const blob: MockBlob = {
          pathname,
          url: `https://private.blob.local/${pathname}`,
          contentType,
          buffer,
          uploadedAt: new Date('2026-04-09T12:00:00.000Z')
        };

        testState.privateBlobs.set(pathname, blob);

        return {
          url: blob.url,
          downloadUrl: `${blob.url}?download=1`,
          pathname,
          contentType,
          contentDisposition: 'attachment',
          etag: `private:${pathname}`
        };
      }
    ),
    deleteBackupBlobs: vi.fn(async (_store: 'private', pathnames: string[]) => {
      for (const pathname of pathnames) {
        testState.privateBlobs.delete(pathname);
      }
    })
  };
});

vi.mock('@/modules/backup/database', () => {
  const fakeClient = {
    query: vi.fn()
  };

  return {
    withBackupDatabaseClient: vi.fn(async (run: (client: typeof fakeClient) => Promise<unknown>) =>
      run(fakeClient)
    ),
    withBackupDatabaseSnapshot: vi.fn(
      async (_client: typeof fakeClient, run: () => Promise<unknown>) => {
        testState.snapshotTransactionCommands.push(
          'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'
        );

        try {
          const result = await run();
          testState.snapshotTransactionCommands.push('COMMIT');
          return result;
        } catch (error) {
          testState.snapshotTransactionCommands.push('ROLLBACK');
          throw error;
        }
      }
    ),
    withBackupRestoreTransaction: vi.fn(
      async (_client: typeof fakeClient, run: () => Promise<unknown>) => {
        const previousRows = structuredClone(testState.rowsByTable);
        testState.restoreTransactionCommands.push('BEGIN');

        try {
          const result = await run();
          testState.restoreTransactionCommands.push('COMMIT');
          return result;
        } catch (error) {
          testState.rowsByTable = previousRows;
          testState.restoreTransactionCommands.push('ROLLBACK');
          throw error;
        }
      }
    ),
    loadBackupDatabaseManifest: vi.fn(async () => testState.tables),
    countBackupTableRows: vi.fn(async (_client: unknown, tableName: string) => {
      return testState.rowsByTable[tableName]?.length ?? 0;
    }),
    dumpBackupTableRows: vi.fn(async (_client: unknown, table: BackupArchiveTableRecord) => {
      return {
        table: table.name,
        rows: testState.rowsByTable[table.name] ?? []
      } satisfies DatabaseTableRowsDocument;
    }),
    validateBackupManifestAgainstDatabase: vi.fn(async () => undefined),
    truncateBackupTables: vi.fn(async (_client: unknown, tables: BackupArchiveTableRecord[]) => {
      testState.truncateCalls += 1;

      for (const table of tables) {
        testState.rowsByTable[table.name] = [];
      }
    }),
    restoreBackupTableRows: vi.fn(
      async (
        _client: unknown,
        table: BackupArchiveTableRecord,
        rows: Array<Record<string, unknown>>
      ) => {
        if (testState.restoreFailureTable === table.name) {
          throw new Error(`restore failed for ${table.name}`);
        }

        testState.rowsByTable[table.name] = rows;
      }
    )
  };
});

const createBlogPostTable = (rowCount = 1): BackupArchiveTableRecord => {
  return {
    name: 'blog_post',
    order: 0,
    rowCount,
    primaryKey: ['id'],
    dependsOn: [],
    columns: [
      { name: 'id', dataType: 'text', udtName: 'text', isNullable: false, ordinalPosition: 1 },
      {
        name: 'title',
        dataType: 'text',
        udtName: 'text',
        isNullable: false,
        ordinalPosition: 2
      }
    ]
  };
};

const createDatabaseManifest = (table: BackupArchiveTableRecord): DatabaseBackupArchiveManifest => {
  return {
    version: BACKUP_MANIFEST_VERSION,
    createdAt: '2026-04-09T12:00:00.000Z',
    archiveKind: 'manual',
    artifact: 'database',
    database: {
      tableCount: 1,
      tables: [table]
    }
  };
};

const createArchiveBuffer = async (
  entries: Array<{ name: string; value: unknown }>
): Promise<Buffer> => {
  const { pack, stream } = createTarGzArchive();
  const bufferPromise = readNodeStreamToBuffer(stream);

  for (const entry of entries) {
    await addBufferArchiveEntry(pack, entry.name, Buffer.from(JSON.stringify(entry.value), 'utf8'));
  }

  finalizeTarArchive(pack);
  return bufferPromise;
};

const putSourceArchive = (pathname: string, buffer: Buffer): void => {
  testState.privateBlobs.set(pathname, {
    pathname,
    url: `https://private.blob.local/${pathname}`,
    contentType: 'application/gzip',
    buffer,
    uploadedAt: new Date('2026-04-09T12:30:00.000Z')
  });
};

describe('backup service orchestration', () => {
  beforeEach(() => {
    testState.privateBlobs.clear();
    testState.tables = [];
    testState.rowsByTable = {};
    testState.truncateCalls = 0;
    testState.snapshotTransactionCommands = [];
    testState.restoreTransactionCommands = [];
    testState.restoreFailureTable = null;
    vi.clearAllMocks();
  });

  it('создание архива БД сериализует таблицы в tar.gz', async () => {
    // Arrange
    testState.tables = [createBlogPostTable(0)];
    testState.rowsByTable.blog_post = [
      {
        id: 'post-1',
        title: 'Hello'
      }
    ];
    const progressLog: string[] = [];
    const { createDatabaseBackupArchive } = await import('../service');

    // Act
    const result = await createDatabaseBackupArchive('manual', async progress => {
      progressLog.push(progress.message);
    });
    const archiveBlob = testState.privateBlobs.get(result.pathname);
    const extractedEntries = new Map<string, Buffer>();

    await extractTarGzArchive(
      Readable.from(archiveBlob?.buffer ?? Buffer.alloc(0)),
      async entry => {
        extractedEntries.set(entry.name, await readNodeStreamToBuffer(entry.stream));
      }
    );

    // Assert
    expect(result.fileName).toContain('site-database-backup-');
    expect(archiveBlob).toBeDefined();
    const manifest = JSON.parse(
      extractedEntries.get('manifest.json')?.toString('utf8') ?? '{}'
    ) as DatabaseBackupArchiveManifest;
    expect(manifest.artifact).toBe('database');
    expect(manifest.database.tableCount).toBe(1);
    expect(
      JSON.parse(
        extractedEntries.get('database/tables/000-blog_post.json')?.toString('utf8') ?? '{}'
      ) as DatabaseTableRowsDocument
    ).toEqual({
      table: 'blog_post',
      rows: [
        {
          id: 'post-1',
          title: 'Hello'
        }
      ]
    });
    expect(progressLog.at(-1)).toBe('Архив БД успешно создан.');
    expect(testState.snapshotTransactionCommands).toEqual([
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
      'COMMIT'
    ]);
  });

  it('восстановление из архива БД разворачивает таблицы и сохраняет теневую копию', async () => {
    // Arrange
    testState.tables = [createBlogPostTable()];
    testState.rowsByTable.blog_post = [
      {
        id: 'backup-post',
        title: 'Archived title'
      }
    ];
    const { createDatabaseBackupArchive, restoreSiteBackupArchives } = await import('../service');

    const sourceArchive = await createDatabaseBackupArchive('manual', async () => undefined);
    const sourceArchivePathname = 'system-backups/uploads/database/restore-database-archive.tar.gz';
    const sourceArchiveBlob = testState.privateBlobs.get(sourceArchive.pathname);

    testState.privateBlobs.set(sourceArchivePathname, {
      pathname: sourceArchivePathname,
      url: `https://private.blob.local/${sourceArchivePathname}`,
      contentType: 'application/gzip',
      buffer: sourceArchiveBlob?.buffer ?? Buffer.alloc(0),
      uploadedAt: new Date('2026-04-09T12:30:00.000Z')
    });

    testState.rowsByTable.blog_post = [
      {
        id: 'current-post',
        title: 'Current title'
      }
    ];

    const progressLog: string[] = [];

    // Act
    const result = await restoreSiteBackupArchives(
      {
        databaseArchivePathname: sourceArchivePathname,
        databaseArchiveFileName: 'restore-database-archive.tar.gz'
      },
      async progress => {
        progressLog.push(progress.message);
      }
    );

    // Assert
    expect(result.databaseShadowBackup.fileName).toContain('shadow-database-backup-');
    expect(testState.rowsByTable.blog_post).toEqual([
      {
        id: 'backup-post',
        title: 'Archived title'
      }
    ]);
    expect(testState.truncateCalls).toBe(1);
    expect(testState.privateBlobs.has(sourceArchivePathname)).toBe(false);
    expect(progressLog.at(-1)).toBe('Восстановление БД из архива завершено.');
    expect(testState.restoreTransactionCommands).toEqual(['BEGIN', 'COMMIT']);
  });

  it('архив без entry таблицы отклоняется до очистки БД', async () => {
    // Arrange
    const table = createBlogPostTable();
    const manifest = createDatabaseManifest(table);
    const sourceArchivePathname =
      'system-backups/uploads/database/missing-table-database-archive.tar.gz';
    testState.tables = [table];
    testState.rowsByTable.blog_post = [{ id: 'current-post', title: 'Current title' }];
    putSourceArchive(
      sourceArchivePathname,
      await createArchiveBuffer([{ name: 'manifest.json', value: manifest }])
    );
    const { restoreSiteBackupArchives } = await import('../service');

    // Act
    const restorePromise = restoreSiteBackupArchives(
      { databaseArchivePathname: sourceArchivePathname },
      async () => undefined
    );

    // Assert
    await expect(restorePromise).rejects.toThrow('не содержит данные таблицы blog_post');
    expect(testState.truncateCalls).toBe(0);
    expect(testState.rowsByTable.blog_post).toEqual([
      { id: 'current-post', title: 'Current title' }
    ]);
    expect(testState.restoreTransactionCommands).toEqual([]);
  });

  it('несовпадение rowCount отклоняется до очистки БД', async () => {
    // Arrange
    const table = createBlogPostTable(2);
    const manifest = createDatabaseManifest(table);
    const sourceArchivePathname =
      'system-backups/uploads/database/invalid-row-count-database-archive.tar.gz';
    testState.tables = [table];
    testState.rowsByTable.blog_post = [{ id: 'current-post', title: 'Current title' }];
    putSourceArchive(
      sourceArchivePathname,
      await createArchiveBuffer([
        { name: 'database/tables/000-blog_post.json', value: { table: 'blog_post', rows: [] } },
        { name: 'manifest.json', value: manifest }
      ])
    );
    const { restoreSiteBackupArchives } = await import('../service');

    // Act
    const restorePromise = restoreSiteBackupArchives(
      { databaseArchivePathname: sourceArchivePathname },
      async () => undefined
    );

    // Assert
    await expect(restorePromise).rejects.toThrow(
      'Количество строк таблицы blog_post не совпадает с manifest'
    );
    expect(testState.truncateCalls).toBe(0);
    expect(testState.restoreTransactionCommands).toEqual([]);
  });

  it('ошибка записи таблицы откатывает destructive restore целиком', async () => {
    // Arrange
    const table = createBlogPostTable();
    const manifest = createDatabaseManifest(table);
    const sourceArchivePathname =
      'system-backups/uploads/database/rollback-database-archive.tar.gz';
    testState.tables = [table];
    testState.rowsByTable.blog_post = [{ id: 'current-post', title: 'Current title' }];
    testState.restoreFailureTable = 'blog_post';
    putSourceArchive(
      sourceArchivePathname,
      await createArchiveBuffer([
        { name: 'manifest.json', value: manifest },
        {
          name: 'database/tables/000-blog_post.json',
          value: {
            table: 'blog_post',
            rows: [{ id: 'backup-post', title: 'Archived title' }]
          }
        }
      ])
    );
    const { restoreSiteBackupArchives } = await import('../service');

    // Act
    const restorePromise = restoreSiteBackupArchives(
      { databaseArchivePathname: sourceArchivePathname },
      async () => undefined
    );

    // Assert
    await expect(restorePromise).rejects.toThrow('restore failed for blog_post');
    expect(testState.restoreTransactionCommands).toEqual(['BEGIN', 'ROLLBACK']);
    expect(testState.rowsByTable.blog_post).toEqual([
      { id: 'current-post', title: 'Current title' }
    ]);
    expect(testState.privateBlobs.has(sourceArchivePathname)).toBe(true);
  });
});
