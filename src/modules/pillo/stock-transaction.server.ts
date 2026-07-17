import type { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

const PILLO_TRANSACTION_MAX_ATTEMPTS = 3;

/**
 * Проверяет ошибку конфликта сериализуемой транзакции Prisma.
 * @param error - неизвестная ошибка выполнения транзакции.
 * @returns `true`, если транзакцию безопасно повторить.
 */
const isRetryablePilloTransactionError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
};

/**
 * Выполняет изменение остатков в сериализуемой транзакции с повтором при конфликте.
 * @param operation - операция над transaction client.
 * @param attempt - номер текущей попытки.
 * @returns Результат операции.
 */
export const runPilloStockTransaction = async <T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  attempt = 1
): Promise<T> => {
  try {
    return await prisma.$transaction(operation, {
      isolationLevel: 'Serializable'
    });
  } catch (error: unknown) {
    if (isRetryablePilloTransactionError(error) && attempt < PILLO_TRANSACTION_MAX_ATTEMPTS) {
      return runPilloStockTransaction(operation, attempt + 1);
    }

    throw error;
  }
};
