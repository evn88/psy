import prisma from '@/lib/prisma';

const PILLO_RUNNER_LEASE_KEY = 'pillo-intake-reminder-runner';
const PILLO_RUNNER_LEASE_DURATION_MS = 25 * 60 * 60 * 1000;

type PilloRunnerLeaseParams = {
  holderId: string;
  now: Date;
};

/**
 * Проверяет ошибку уникальности Prisma, возникающую при конкурентном создании lease.
 * @param error - неизвестная ошибка Prisma.
 * @returns `true` для ошибки P2002.
 */
const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
};

/**
 * Атомарно резервирует право запустить единый Pillo runner.
 * @param params - владелец lease и текущее время.
 * @returns `true`, если текущий процесс получил lease.
 */
export const acquirePilloRunnerLease = async ({
  holderId,
  now
}: PilloRunnerLeaseParams): Promise<boolean> => {
  const expiresAt = new Date(now.getTime() + PILLO_RUNNER_LEASE_DURATION_MS);
  const renewed = await prisma.workflowLease.updateMany({
    where: {
      key: PILLO_RUNNER_LEASE_KEY,
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
        key: PILLO_RUNNER_LEASE_KEY,
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
 * Освобождает lease после ошибки запуска, не затрагивая нового владельца.
 * @param holderId - идентификатор владельца lease.
 */
export const releasePilloRunnerLease = async (holderId: string): Promise<void> => {
  await prisma.workflowLease.deleteMany({
    where: {
      key: PILLO_RUNNER_LEASE_KEY,
      holderId
    }
  });
};
