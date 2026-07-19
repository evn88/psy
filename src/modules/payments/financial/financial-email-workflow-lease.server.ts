import prisma from '@/lib/prisma';

const FINANCIAL_EMAIL_WORKER_LEASE_KEY = 'financial-email-outbox-worker';
const FINANCIAL_EMAIL_WORKER_LEASE_DURATION_MS = 24 * 60 * 60 * 1000;

type FinancialEmailWorkerLeaseParams = {
  holderId: string;
  now: Date;
};

/** Проверяет ошибку уникальности Prisma при конкурентном создании lease. */
const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
};

/**
 * Атомарно резервирует право на запуск единственного worker финансовых писем.
 * @param params - владелец lease и время запуска.
 * @returns `true`, если worker можно поставить в очередь.
 */
export const acquireFinancialEmailWorkerLease = async ({
  holderId,
  now
}: FinancialEmailWorkerLeaseParams): Promise<boolean> => {
  const expiresAt = new Date(now.getTime() + FINANCIAL_EMAIL_WORKER_LEASE_DURATION_MS);
  const renewed = await prisma.workflowLease.updateMany({
    where: {
      key: FINANCIAL_EMAIL_WORKER_LEASE_KEY,
      expiresAt: { lte: now }
    },
    data: {
      holderId,
      expiresAt
    }
  });

  if (renewed.count > 0) {
    return true;
  }

  try {
    await prisma.workflowLease.create({
      data: {
        key: FINANCIAL_EMAIL_WORKER_LEASE_KEY,
        holderId,
        expiresAt
      }
    });
    return true;
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return false;
    }

    throw error;
  }
};

/**
 * Освобождает lease worker, не затрагивая нового владельца.
 * @param holderId - идентификатор владельца lease.
 */
export const releaseFinancialEmailWorkerLease = async (holderId: string): Promise<void> => {
  await prisma.workflowLease.deleteMany({
    where: {
      key: FINANCIAL_EMAIL_WORKER_LEASE_KEY,
      holderId
    }
  });
};
