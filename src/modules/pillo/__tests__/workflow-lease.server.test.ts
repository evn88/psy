import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    workflowLease: {
      create: mocks.create,
      deleteMany: mocks.deleteMany,
      updateMany: mocks.updateMany
    }
  }
}));

import { acquirePilloRunnerLease, releasePilloRunnerLease } from '../workflow-lease.server';

describe('Pillo workflow lease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.create.mockResolvedValue({});
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it('создаёт lease для первого runner', async () => {
    // Arrange
    const now = new Date('2026-07-17T10:00:00.000Z');

    // Act
    const acquired = await acquirePilloRunnerLease({ holderId: 'runner-1', now });

    // Assert
    expect(acquired).toBe(true);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        key: 'pillo-intake-reminder-runner',
        holderId: 'runner-1',
        expiresAt: new Date('2026-07-18T11:00:00.000Z')
      }
    });
  });

  it('не выдаёт занятый lease конкурентному runner', async () => {
    // Arrange
    mocks.create.mockRejectedValueOnce({ code: 'P2002' });

    // Act
    const acquired = await acquirePilloRunnerLease({
      holderId: 'runner-2',
      now: new Date('2026-07-17T10:00:00.000Z')
    });

    // Assert
    expect(acquired).toBe(false);
  });

  it('продлевает истёкший lease атомарным update', async () => {
    // Arrange
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    // Act
    const acquired = await acquirePilloRunnerLease({
      holderId: 'runner-3',
      now: new Date('2026-07-17T10:00:00.000Z')
    });

    // Assert
    expect(acquired).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('освобождает только lease текущего владельца', async () => {
    // Act
    await releasePilloRunnerLease('runner-4');

    // Assert
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        key: 'pillo-intake-reminder-runner',
        holderId: 'runner-4'
      }
    });
  });
});
