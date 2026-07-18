import { randomUUID } from 'node:crypto';

import { runPilloIntakeReminderWorkflow } from '@/workflows/pillo-intake-reminder-workflow';
import prisma from '@/lib/prisma';
import {
  acquirePilloRunnerLease,
  releasePilloRunnerLease
} from '@/modules/pillo/workflow-lease.server';

/**
 * Запускает единый runner Pillo-напоминаний для всех пользователей.
 * @param now - дата запуска, относительно которой ищутся наступившие приёмы.
 * @returns `true`, если workflow runner был поставлен в очередь.
 */
export const startPilloIntakeReminderRunnerWorkflow = async (
  now = new Date()
): Promise<boolean> => {
  const holderId = randomUUID();
  let hasLease = false;

  try {
    hasLease = await acquirePilloRunnerLease({ holderId, now });
    if (!hasLease) {
      return false;
    }

    const { start } = await import('workflow/api');
    await start(runPilloIntakeReminderWorkflow, [{ holderId, nowIso: now.toISOString() }]);

    try {
      await prisma.systemLogEntry.create({
        data: {
          category: 'API',
          level: 'INFO',
          source: 'PilloWorkflowRunner',
          operation: 'START'
        }
      });
    } catch (dbError) {
      console.error('Failed to log Pillo workflow start:', dbError);
    }

    return true;
  } catch (error) {
    if (hasLease) {
      try {
        await releasePilloRunnerLease(holderId);
      } catch (releaseError: unknown) {
        console.error('Failed to release Pillo workflow runner lease:', releaseError);
      }
    }

    console.error('Failed to start Pillo intake reminder runner workflow:', error);
    return false;
  }
};
