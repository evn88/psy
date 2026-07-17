import { describe, expect, it, vi } from 'vitest';

import {
  assertDatabaseIdentitiesMatch,
  bootstrapDirectDatabaseIdentity
} from '../verify-database-identity.mjs';

describe('database identity deploy preflight', () => {
  it('bootstrap создаёт только идемпотентный служебный sentinel', async () => {
    // Arrange
    const directPool = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    // Act
    await bootstrapDirectDatabaseIdentity(directPool);

    // Assert
    const sql = directPool.query.mock.calls[0]?.[0];
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "DatabaseIdentity"');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS');
    expect(sql).toContain('ON CONFLICT ("key") DO NOTHING');
    expect(sql).not.toContain('"User"');
    expect(sql).not.toContain('"PilloIntake"');
  });

  it('сравнивает одинаковый instanceId через runtime и direct подключения', async () => {
    // Arrange
    const runtimeClient = {
      databaseIdentity: {
        findUnique: vi.fn().mockResolvedValue({ instanceId: 'database-1' })
      }
    };
    const directPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ instanceId: 'database-1' }]
      })
    };

    // Act + Assert
    await expect(assertDatabaseIdentitiesMatch(runtimeClient, directPool)).resolves.toBeUndefined();
  });

  it('останавливает deploy при разных instanceId', async () => {
    // Arrange
    const runtimeClient = {
      databaseIdentity: {
        findUnique: vi.fn().mockResolvedValue({ instanceId: 'runtime-database' })
      }
    };
    const directPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ instanceId: 'direct-database' }]
      })
    };

    // Act + Assert
    await expect(assertDatabaseIdentitiesMatch(runtimeClient, directPool)).rejects.toThrow(
      'Runtime и direct URL указывают на разные экземпляры базы данных'
    );
  });
});
