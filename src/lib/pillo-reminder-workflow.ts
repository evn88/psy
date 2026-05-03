import { start } from 'workflow/api';

import { runPilloIntakeReminderWorkflow } from '@/workflows/pillo-intake-reminder-workflow';
import prisma from '@/lib/prisma';

/**
 * Запускает единый runner Pillo-напоминаний для всех пользователей.
 * @param now - дата запуска, относительно которой ищутся наступившие приёмы.
 * @returns `true`, если workflow runner был поставлен в очередь.
 */
export const startPilloIntakeReminderRunnerWorkflow = async (
  now = new Date()
): Promise<boolean> => {
  try {
    await start(runPilloIntakeReminderWorkflow, [{ nowIso: now.toISOString() }]);

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
    console.error('Failed to start Pillo intake reminder runner workflow:', error);
    return false;
  }
};
