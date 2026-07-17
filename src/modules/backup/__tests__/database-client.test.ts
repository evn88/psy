import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolState = vi.hoisted(() => {
  const client = {
    query: vi.fn(),
    release: vi.fn()
  };

  return {
    client,
    connect: vi.fn(async () => client),
    end: vi.fn(async () => undefined),
    options: null as Record<string, unknown> | null
  };
});

const runtimeIdentityState = vi.hoisted(() => ({
  findUnique: vi.fn()
}));

vi.mock('@/lib/database-url', () => {
  return {
    resolveDirectDatabaseUrl: vi.fn(() => 'postgresql://user:password@localhost:5432/app')
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    databaseIdentity: {
      findUnique: runtimeIdentityState.findUnique
    }
  }
}));

vi.mock('pg', () => {
  return {
    Pool: class {
      constructor(options: Record<string, unknown>) {
        poolState.options = options;
      }

      connect = poolState.connect;
      end = poolState.end;
    }
  };
});

describe('backup database client', () => {
  beforeEach(() => {
    poolState.connect.mockClear();
    poolState.end.mockClear();
    poolState.client.query.mockReset();
    poolState.client.release.mockClear();
    poolState.client.query.mockResolvedValue({
      rows: [{ instanceId: 'database-instance-1' }]
    });
    runtimeIdentityState.findUnique.mockReset();
    runtimeIdentityState.findUnique.mockResolvedValue({
      instanceId: 'database-instance-1'
    });
    poolState.options = null;
  });

  it('передаёт операции закреплённый PoolClient и освобождает его', async () => {
    // Arrange
    const { withBackupDatabaseClient } = await import('../database');
    const run = vi.fn(async () => 'done');

    // Act
    const result = await withBackupDatabaseClient(run);

    // Assert
    expect(result).toBe('done');
    expect(poolState.connect).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith(poolState.client);
    expect(poolState.client.release).toHaveBeenCalledOnce();
    expect(poolState.end).toHaveBeenCalledOnce();
    expect(poolState.options).toMatchObject({
      connectionString: 'postgresql://user:password@localhost:5432/app'
    });
    expect(runtimeIdentityState.findUnique).toHaveBeenCalledWith({
      where: { key: 'primary' },
      select: { instanceId: true }
    });
  });

  it('освобождает PoolClient и закрывает pool при ошибке операции', async () => {
    // Arrange
    const { withBackupDatabaseClient } = await import('../database');

    // Act
    const runPromise = withBackupDatabaseClient(async () => {
      throw new Error('backup failed');
    });

    // Assert
    await expect(runPromise).rejects.toThrow('backup failed');
    expect(poolState.client.release).toHaveBeenCalledOnce();
    expect(poolState.end).toHaveBeenCalledOnce();
  });

  it('останавливает backup до операции при несовпадающих identity', async () => {
    // Arrange
    const { withBackupDatabaseClient } = await import('../database');
    const run = vi.fn();
    poolState.client.query.mockResolvedValueOnce({
      rows: [{ instanceId: 'direct-database' }]
    });
    runtimeIdentityState.findUnique.mockResolvedValueOnce({
      instanceId: 'runtime-database'
    });

    // Act
    const runPromise = withBackupDatabaseClient(run);

    // Assert
    await expect(runPromise).rejects.toThrow(
      'Runtime и direct URL указывают на разные экземпляры базы данных'
    );
    expect(run).not.toHaveBeenCalled();
    expect(poolState.client.release).toHaveBeenCalledOnce();
    expect(poolState.end).toHaveBeenCalledOnce();
  });

  it('останавливает backup при отсутствии identity в runtime БД', async () => {
    // Arrange
    const { withBackupDatabaseClient } = await import('../database');
    const run = vi.fn();
    runtimeIdentityState.findUnique.mockResolvedValueOnce(null);

    // Act
    const runPromise = withBackupDatabaseClient(run);

    // Assert
    await expect(runPromise).rejects.toThrow(
      'Runtime БД не содержит обязательную запись DatabaseIdentity'
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('останавливает backup при отсутствии identity в direct БД', async () => {
    // Arrange
    const { withBackupDatabaseClient } = await import('../database');
    const run = vi.fn();
    poolState.client.query.mockResolvedValueOnce({ rows: [] });

    // Act
    const runPromise = withBackupDatabaseClient(run);

    // Assert
    await expect(runPromise).rejects.toThrow(
      'Direct БД не содержит обязательную запись DatabaseIdentity'
    );
    expect(run).not.toHaveBeenCalled();
  });
});
