import { PilloIntakeStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/shared/lib/prisma', () => ({
  default: {
    pilloIntake: {
      update: vi.fn()
    }
  }
}));
vi.mock('@/workflows/pillo-intake-reminder-workflow', () => ({
  runPilloIntakeReminderWorkflow: vi.fn()
}));

import {
  canStartPilloIntakeReminderWorkflow,
  type PilloReminderWorkflowTargetIntake
} from '../pillo-reminder-workflow';

describe('Pillo reminder workflow launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('разрешает запуск только для pending-приёма без уже запущенного workflow', () => {
    // Arrange
    const intake: PilloReminderWorkflowTargetIntake = {
      id: 'intake-1',
      status: PilloIntakeStatus.PENDING,
      scheduledFor: new Date('2026-05-02T10:00:00.000Z'),
      reminderWorkflowStartedAt: null,
      scheduleRule: {
        reminderWorkflowVersion: 1
      }
    };

    // Act
    const result = canStartPilloIntakeReminderWorkflow(intake);

    // Assert
    expect(result).toBe(true);
  });

  it('запрещает повторный запуск для уже обработанного intake', () => {
    // Arrange
    const intake: PilloReminderWorkflowTargetIntake = {
      id: 'intake-1',
      status: PilloIntakeStatus.TAKEN,
      scheduledFor: new Date('2026-05-02T10:00:00.000Z'),
      reminderWorkflowStartedAt: null,
      scheduleRule: {
        reminderWorkflowVersion: 1
      }
    };

    // Act
    const result = canStartPilloIntakeReminderWorkflow(intake);

    // Assert
    expect(result).toBe(false);
  });
});
