import { start } from 'workflow/api';
import { runSystemLogCleanupWorkflow } from '@/workflows/system-log-cleanup-workflow';

/**
 * Запускает durable workflow очистки системного журнала по retention-настройке.
 * @returns Идентификатор workflow run или `null`, если запуск не удался.
 */
export const startSystemLogCleanupWorkflow = async (): Promise<string | null> => {
  try {
    const run = await start(runSystemLogCleanupWorkflow, [{ triggeredBy: 'cron' }]);
    return run.runId;
  } catch (error) {
    console.error('Failed to start system log cleanup workflow:', error);
    return null;
  }
};
