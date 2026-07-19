import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acquireLease: vi.fn(),
  releaseLease: vi.fn()
}));

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/workflows/financial-email-outbox-workflow', () => ({
  runFinancialEmailOutboxWorkflow: vi.fn()
}));
vi.mock('@/modules/payments/financial/financial-email-workflow-lease.server', () => ({
  acquireFinancialEmailWorkerLease: mocks.acquireLease,
  releaseFinancialEmailWorkerLease: mocks.releaseLease
}));

import { start } from 'workflow/api';

import { startFinancialEmailOutboxWorkflow } from '../financial-email-workflow';
import { runFinancialEmailOutboxWorkflow } from '@/workflows/financial-email-outbox-workflow';

describe('Запуск worker финансовых писем', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.acquireLease.mockResolvedValue(true);
    mocks.releaseLease.mockResolvedValue(undefined);
  });

  it('ставит суточный worker в очередь после получения lease', async () => {
    // Arrange
    const now = new Date('2026-07-19T10:00:00.000Z');

    // Act
    const result = await startFinancialEmailOutboxWorkflow(now);

    // Assert
    expect(result).toBe(true);
    expect(start).toHaveBeenCalledWith(runFinancialEmailOutboxWorkflow, [
      { holderId: expect.any(String) }
    ]);
    expect(mocks.acquireLease).toHaveBeenCalledWith({
      holderId: expect.any(String),
      now
    });
  });

  it('не запускает второй worker при занятом lease', async () => {
    // Arrange
    mocks.acquireLease.mockResolvedValueOnce(false);

    // Act
    const result = await startFinancialEmailOutboxWorkflow();

    // Assert
    expect(result).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it('освобождает lease, если workflow не удалось поставить в очередь', async () => {
    // Arrange
    vi.mocked(start).mockRejectedValueOnce(new Error('workflow unavailable'));

    // Act
    const result = await startFinancialEmailOutboxWorkflow();

    // Assert
    expect(result).toBe(false);
    expect(mocks.releaseLease).toHaveBeenCalledWith(expect.any(String));
  });
});
