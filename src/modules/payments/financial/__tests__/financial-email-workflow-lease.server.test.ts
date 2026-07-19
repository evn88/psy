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

import {
  acquireFinancialEmailWorkerLease,
  releaseFinancialEmailWorkerLease
} from '../financial-email-workflow-lease.server';

describe('Lease worker финансовых писем', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.create.mockResolvedValue({});
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it('создаёт lease для первого worker', async () => {
    // Arrange
    const now = new Date('2026-07-19T10:00:00.000Z');

    // Act
    const acquired = await acquireFinancialEmailWorkerLease({ holderId: 'worker-1', now });

    // Assert
    expect(acquired).toBe(true);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        key: 'financial-email-outbox-worker',
        holderId: 'worker-1',
        expiresAt: new Date('2026-07-20T10:00:00.000Z')
      }
    });
  });

  it('не выдаёт lease конкурентному worker', async () => {
    // Arrange
    mocks.create.mockRejectedValueOnce({ code: 'P2002' });

    // Act
    const acquired = await acquireFinancialEmailWorkerLease({
      holderId: 'worker-2',
      now: new Date('2026-07-19T10:00:00.000Z')
    });

    // Assert
    expect(acquired).toBe(false);
  });

  it('освобождает только lease текущего worker', async () => {
    // Act
    await releaseFinancialEmailWorkerLease('worker-3');

    // Assert
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        key: 'financial-email-outbox-worker',
        holderId: 'worker-3'
      }
    });
  });
});
