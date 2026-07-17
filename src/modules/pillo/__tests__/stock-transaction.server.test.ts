import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mocks.transaction
  }
}));

import { runPilloStockTransaction } from '../stock-transaction.server';

describe('Pillo stock transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('использует сериализуемую изоляцию', async () => {
    // Arrange
    const operation = vi.fn();
    mocks.transaction.mockResolvedValueOnce('ok');

    // Act
    const result = await runPilloStockTransaction(operation);

    // Assert
    expect(result).toBe('ok');
    expect(mocks.transaction).toHaveBeenCalledWith(operation, {
      isolationLevel: 'Serializable'
    });
  });

  it('повторяет транзакцию после конфликта P2034', async () => {
    // Arrange
    const operation = vi.fn();
    mocks.transaction.mockRejectedValueOnce({ code: 'P2034' }).mockResolvedValueOnce('ok');

    // Act
    const result = await runPilloStockTransaction(operation);

    // Assert
    expect(result).toBe('ok');
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });

  it('не скрывает ошибку после исчерпания повторов', async () => {
    // Arrange
    const conflict = { code: 'P2034' };
    const operation = vi.fn();
    mocks.transaction.mockRejectedValue(conflict);

    // Act + Assert
    await expect(runPilloStockTransaction(operation)).rejects.toBe(conflict);
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });
});
