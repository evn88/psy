import { sleep } from 'workflow';

import { releaseFinancialEmailWorkerLease } from '@/modules/payments/financial/financial-email-workflow-lease.server';

type FinancialEmailOutboxWorkflowParams = {
  holderId?: string;
};

type FinancialEmailOutboxWorkflowResult = {
  status: 'completed';
  claimed: number;
  sent: number;
  failed: number;
};

type FinancialEmailOutboxBatchResult = Omit<FinancialEmailOutboxWorkflowResult, 'status'>;

const FINANCIAL_EMAIL_WORKER_ITERATIONS = 24 * 60;

/** Обрабатывает одну очередь ожидающих финансовых писем. */
const processFinancialEmailOutboxStep = async (): Promise<FinancialEmailOutboxBatchResult> => {
  'use step';

  const { processFinancialEmailOutbox } = await import(
    '@/modules/payments/financial/financial-email-outbox.server'
  );

  return processFinancialEmailOutbox();
};

/** Освобождает lease после штатного завершения worker. */
const releaseFinancialEmailWorkerLeaseStep = async (holderId: string): Promise<void> => {
  'use step';

  await releaseFinancialEmailWorkerLease(holderId);
};

/**
 * Непрерывно доставляет финансовые письма в течение суток.
 * @param params - данные владельца lease.
 * @returns Суммарный результат всех обработанных очередей.
 */
export const runFinancialEmailOutboxWorkflow = async (
  params: FinancialEmailOutboxWorkflowParams = {}
): Promise<FinancialEmailOutboxWorkflowResult> => {
  'use workflow';

  let claimed = 0;
  let sent = 0;
  let failed = 0;

  for (let iteration = 0; iteration < FINANCIAL_EMAIL_WORKER_ITERATIONS; iteration++) {
    const result = await processFinancialEmailOutboxStep();

    claimed += result.claimed;
    sent += result.sent;
    failed += result.failed;

    if (iteration < FINANCIAL_EMAIL_WORKER_ITERATIONS - 1) {
      await sleep('1m');
    }
  }

  if (params.holderId) {
    await releaseFinancialEmailWorkerLeaseStep(params.holderId);
  }

  return {
    status: 'completed',
    claimed,
    sent,
    failed
  };
};
