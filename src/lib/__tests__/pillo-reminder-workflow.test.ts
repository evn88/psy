import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acquireLease: vi.fn(),
  createLog: vi.fn(),
  releaseLease: vi.fn()
}));

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/workflows/pillo-intake-reminder-workflow', () => ({
  runPilloIntakeReminderWorkflow: vi.fn()
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    systemLogEntry: {
      create: mocks.createLog
    }
  }
}));
vi.mock('@/modules/pillo/workflow-lease.server', () => ({
  acquirePilloRunnerLease: mocks.acquireLease,
  releasePilloRunnerLease: mocks.releaseLease
}));

import { startPilloIntakeReminderRunnerWorkflow } from '../pillo-reminder-workflow';
import { start } from 'workflow/api';
import { runPilloIntakeReminderWorkflow } from '@/workflows/pillo-intake-reminder-workflow';

describe('Pillo reminder workflow runner launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.acquireLease.mockResolvedValue(true);
    mocks.createLog.mockResolvedValue(undefined);
    mocks.releaseLease.mockResolvedValue(undefined);
  });

  it('запускает единый runner с датой проверки', async () => {
    // Arrange
    const now = new Date('2026-05-03T10:00:00.000Z');

    // Act
    const result = await startPilloIntakeReminderRunnerWorkflow(now);

    // Assert
    expect(result).toBe(true);
    expect(start).toHaveBeenCalledWith(runPilloIntakeReminderWorkflow, [
      {
        holderId: expect.any(String),
        nowIso: '2026-05-03T10:00:00.000Z'
      }
    ]);
    expect(mocks.acquireLease).toHaveBeenCalledWith({
      holderId: expect.any(String),
      now
    });
  });

  it('не запускает второй runner при занятом lease', async () => {
    // Arrange
    mocks.acquireLease.mockResolvedValueOnce(false);

    // Act
    const result = await startPilloIntakeReminderRunnerWorkflow();

    // Assert
    expect(result).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it('возвращает false, если runner не удалось поставить в очередь', async () => {
    // Arrange
    vi.mocked(start).mockRejectedValueOnce(new Error('workflow unavailable'));

    // Act
    const result = await startPilloIntakeReminderRunnerWorkflow();

    // Assert
    expect(result).toBe(false);
    expect(mocks.releaseLease).toHaveBeenCalledWith(expect.any(String));
  });
});
