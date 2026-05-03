import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/workflows/pillo-intake-reminder-workflow', () => ({
  runPilloIntakeReminderWorkflow: vi.fn()
}));

import { startPilloIntakeReminderRunnerWorkflow } from '../pillo-reminder-workflow';
import { start } from 'workflow/api';
import { runPilloIntakeReminderWorkflow } from '@/workflows/pillo-intake-reminder-workflow';

describe('Pillo reminder workflow runner launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('запускает единый runner с датой проверки', async () => {
    // Arrange
    const now = new Date('2026-05-03T10:00:00.000Z');

    // Act
    const result = await startPilloIntakeReminderRunnerWorkflow(now);

    // Assert
    expect(result).toBe(true);
    expect(start).toHaveBeenCalledWith(runPilloIntakeReminderWorkflow, [
      { nowIso: '2026-05-03T10:00:00.000Z' }
    ]);
  });

  it('возвращает false, если runner не удалось поставить в очередь', async () => {
    // Arrange
    vi.mocked(start).mockRejectedValueOnce(new Error('workflow unavailable'));

    // Act
    const result = await startPilloIntakeReminderRunnerWorkflow();

    // Assert
    expect(result).toBe(false);
  });
});
