import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTarGzArchive } from '../archive';
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
    truncateCalls: 0
  };
});

vi.mock('@/shared/lib/backup/blob', () => {
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

vi.mock('@/shared/lib/backup/database', () => {
  const fakeClient = {
    query: vi.fn()
  };

  return {
    withBackupDatabaseClient: vi.fn(async (run: (client: typeof fakeClient) => Promise<unknown>) =>
      run(fakeClient)
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
        testState.rowsByTable[table.name] = rows;
      }
    )
  };
});

describe('backup service orchestration', () => {
  beforeEach(() => {
    testState.privateBlobs.clear();
    testState.tables = [];
    testState.rowsByTable = {};
    testState.truncateCalls = 0;
    vi.clearAllMocks();
  });

  it('создание архива БД сериализует таблицы в tar.gz', async () => {
    // Arrange
    testState.tables = [
      {
        name: 'blog_post',
        order: 0,
        rowCount: 0,
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
      }
    ];
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
  });

  it('восстановление из архива БД разворачивает таблицы и сохраняет теневую копию', async () => {
    // Arrange
    testState.tables = [
      {
        name: 'blog_post',
        order: 0,
        rowCount: 1,
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
      }
    ];
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
  });
});
