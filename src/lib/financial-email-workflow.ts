import { randomUUID } from 'node:crypto';

import { runFinancialEmailOutboxWorkflow } from '@/workflows/financial-email-outbox-workflow';
import {
  acquireFinancialEmailWorkerLease,
  releaseFinancialEmailWorkerLease
} from '@/modules/payments/financial/financial-email-workflow-lease.server';

/**
 * Запускает суточный durable worker доставки финансовых писем.
 * @param now - время запуска worker.
 * @returns `true`, если worker был поставлен в очередь.
 */
export const startFinancialEmailOutboxWorkflow = async (now = new Date()): Promise<boolean> => {
  const holderId = randomUUID();
  let hasLease = false;

  try {
    hasLease = await acquireFinancialEmailWorkerLease({ holderId, now });
    if (!hasLease) {
      return false;
    }

    const { start } = await import('workflow/api');
    await start(runFinancialEmailOutboxWorkflow, [{ holderId }]);

    return true;
  } catch (error: unknown) {
    if (hasLease) {
      try {
        await releaseFinancialEmailWorkerLease(holderId);
      } catch (releaseError: unknown) {
        console.error('Не удалось освободить lease worker финансовых писем:', releaseError);
      }
    }

    console.error('Не удалось запустить worker финансовых писем:', error);
    return false;
  }
};
