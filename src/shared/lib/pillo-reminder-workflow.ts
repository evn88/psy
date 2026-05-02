import { PilloIntakeStatus } from '@prisma/client';
import { start } from 'workflow/api';

import prisma from '@/shared/lib/prisma';
import { runPilloIntakeReminderWorkflow } from '@/workflows/pillo-intake-reminder-workflow';

export type PilloReminderWorkflowTargetIntake = {
  id: string;
  status: PilloIntakeStatus;
  scheduledFor: Date;
  reminderWorkflowStartedAt: Date | null;
  scheduleRule: {
    reminderWorkflowVersion: number;
  };
};

/**
 * Проверяет, нужно ли запускать workflow-напоминание для приёма.
 * @param intake - приём лекарства с текущим статусом.
 * @returns `true`, если workflow ещё не запускался и приём ожидает действия.
 */
export const canStartPilloIntakeReminderWorkflow = (
  intake: PilloReminderWorkflowTargetIntake
): boolean => {
  return intake.status === PilloIntakeStatus.PENDING && !intake.reminderWorkflowStartedAt;
};

/**
 * Запускает workflow-напоминание по одному приёму Pillo.
 * @param intake - приём, для которого нужно отправить напоминание.
 * @returns `true`, если workflow был поставлен в очередь.
 */
export const startPilloIntakeReminderWorkflow = async (
  intake: PilloReminderWorkflowTargetIntake
): Promise<boolean> => {
  if (!canStartPilloIntakeReminderWorkflow(intake)) {
    return false;
  }

  try {
    await start(runPilloIntakeReminderWorkflow, [
      {
        intakeId: intake.id,
        scheduleRuleVersion: intake.scheduleRule.reminderWorkflowVersion
      }
    ]);

    await prisma.pilloIntake.update({
      where: { id: intake.id },
      data: { reminderWorkflowStartedAt: new Date() }
    });

    return true;
  } catch (error) {
    console.error('Failed to start Pillo intake reminder workflow:', {
      intakeId: intake.id,
      error
    });

    return false;
  }
};
