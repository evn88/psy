import {
  EventBillingSource,
  FinancialOperationStatus,
  FinancialOperationType,
  Prisma,
  PurchasedPackageStatus,
  WalletTransactionType
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/prisma', () => ({
  default: {}
}));

import {
  chargeConsultationInTransaction,
  fulfillDirectPackagePurchase,
  recordTopupCredit
} from '../financial-service.server';

const createTransaction = (
  initialBalance: string,
  initialPackageMinutes = 0,
  packageTotalMinutes = 120
) => {
  let balance = new Prisma.Decimal(initialBalance);
  let packageState = {
    id: 'purchased-package-1',
    remainingMinutes: initialPackageMinutes,
    totalMinutes: packageTotalMinutes,
    status: PurchasedPackageStatus.ACTIVE
  };
  const walletEntries: Array<Record<string, unknown>> = [];
  const packageEntries: Array<Record<string, unknown>> = [];
  const outboxEntries: Array<Record<string, unknown>> = [];

  const transaction = {
    financialOperation: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => ({
        ...data,
        id: 'operation-1',
        status: FinancialOperationStatus.PENDING
      })),
      update: vi.fn().mockImplementation(({ data }) => ({
        id: 'operation-1',
        type: FinancialOperationType.TOPUP,
        status: data.status
      }))
    },
    user: {
      findUniqueOrThrow: vi.fn().mockImplementation(({ select }) =>
        select.balance
          ? { balance }
          : {
              email: 'client@example.com',
              language: 'ru',
              name: 'Клиент'
            }
      ),
      update: vi.fn().mockImplementation(({ data }) => {
        balance = data.balance;
        return { id: 'user-1', balance };
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          email: 'admin@example.com',
          language: 'ru',
          name: 'Администратор'
        }
      ])
    },
    walletTransaction: {
      create: vi.fn().mockImplementation(({ data }) => {
        walletEntries.push(data);
        return { id: `wallet-${walletEntries.length}`, ...data };
      })
    },
    financialEmailOutbox: {
      create: vi.fn().mockImplementation(({ data }) => {
        outboxEntries.push(data);
        return { id: `email-${outboxEntries.length}`, ...data };
      })
    },
    payment: {
      update: vi.fn().mockResolvedValue({ id: 'payment-1' })
    },
    servicePackage: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'package-1',
        amount: new Prisma.Decimal('50.00'),
        currency: 'EUR',
        includedMinutes: 120,
        title: { ru: 'Две консультации' }
      })
    },
    consultationRate: {
      findUnique: vi.fn().mockResolvedValue({
        amount: new Prisma.Decimal('60.00'),
        currency: 'EUR'
      })
    },
    purchasedPackage: {
      create: vi.fn().mockImplementation(({ data }) => {
        packageState = {
          id: 'purchased-package-1',
          remainingMinutes: data.remainingMinutes,
          totalMinutes: data.totalMinutes,
          status: PurchasedPackageStatus.ACTIVE
        };
        return packageState;
      }),
      findFirst: vi.fn().mockImplementation(() => ({
        id: packageState.id,
        titleSnapshot: { ru: 'Пакет консультаций' }
      })),
      findUniqueOrThrow: vi.fn().mockImplementation(() => packageState),
      update: vi.fn().mockImplementation(({ data }) => {
        packageState = { ...packageState, ...data };
        return packageState;
      })
    },
    packageTransaction: {
      create: vi.fn().mockImplementation(({ data }) => {
        packageEntries.push(data);
        return { id: `package-entry-${packageEntries.length}`, ...data };
      })
    },
    eventBillingAllocation: {
      create: vi.fn().mockImplementation(({ data }) => ({
        id: 'allocation-1',
        ...data
      }))
    }
  };

  return {
    transaction,
    getBalance: () => balance,
    getPackageState: () => packageState,
    walletEntries,
    packageEntries,
    outboxEntries
  };
};

describe('financial service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('зачисляет подтверждённое пополнение и фиксирует баланс до и после', async () => {
    const state = createTransaction('10.00');

    await recordTopupCredit({
      transaction: state.transaction as never,
      paymentId: 'payment-1',
      userId: 'user-1',
      amount: new Prisma.Decimal('25.00'),
      provider: 'PAYPAL'
    });

    expect(state.getBalance().equals('35.00')).toBe(true);
    expect(state.walletEntries).toHaveLength(1);
    expect(state.walletEntries[0]).toEqual(
      expect.objectContaining({
        amount: new Prisma.Decimal('25.00'),
        balanceBefore: new Prisma.Decimal('10.00'),
        balanceAfter: new Prisma.Decimal('35.00'),
        currency: 'EUR',
        type: 'TOPUP'
      })
    );
    expect(state.outboxEntries).toHaveLength(2);
  });

  it('при прямой покупке сначала зачисляет деньги, затем списывает цену и начисляет минуты', async () => {
    const state = createTransaction('20.00');

    await fulfillDirectPackagePurchase({
      transaction: state.transaction as never,
      paymentId: 'payment-1',
      userId: 'user-1',
      amount: new Prisma.Decimal('50.00'),
      servicePackageId: 'package-1',
      provider: 'STRIPE'
    });

    expect(state.getBalance().equals('20.00')).toBe(true);
    expect(state.walletEntries).toHaveLength(2);
    expect(state.walletEntries.map(entry => (entry.amount as Prisma.Decimal).toFixed(2))).toEqual([
      '50.00',
      '-50.00'
    ]);
    expect(state.getPackageState()).toEqual(
      expect.objectContaining({
        remainingMinutes: 120,
        totalMinutes: 120,
        status: PurchasedPackageStatus.ACTIVE
      })
    );
    expect(state.packageEntries).toEqual([
      expect.objectContaining({
        minutes: 120,
        remainingBefore: 0,
        remainingAfter: 120,
        type: 'PURCHASE_CREDIT'
      })
    ]);
    expect(state.outboxEntries).toHaveLength(2);
  });

  it('списывает всю длительность консультации из пакета при создании встречи', async () => {
    const state = createTransaction('0.00', 60, 60);

    await chargeConsultationInTransaction(state.transaction as never, {
      eventId: 'event-1',
      userId: 'user-1',
      initiatedById: 'admin-1',
      durationMinutes: 60,
      eventStart: new Date('2026-07-20T10:00:00.000Z'),
      billing: {
        source: EventBillingSource.PACKAGE,
        purchasedPackageId: 'purchased-package-1'
      }
    });

    expect(state.getPackageState()).toEqual(
      expect.objectContaining({
        remainingMinutes: 0,
        totalMinutes: 60,
        status: PurchasedPackageStatus.EXHAUSTED
      })
    );
    expect(state.packageEntries).toEqual([
      expect.objectContaining({
        eventId: 'event-1',
        minutes: -60,
        remainingBefore: 60,
        remainingAfter: 0,
        type: 'CONSULTATION_DEBIT'
      })
    ]);
    expect(state.transaction.eventBillingAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'event-1',
        purchasedPackageId: 'purchased-package-1',
        source: EventBillingSource.PACKAGE,
        chargedMinutes: 60
      })
    });
  });

  it('списывает с денежного баланса сумму пропорционально длительности консультации', async () => {
    // Arrange
    const state = createTransaction('100.00');

    // Act
    await chargeConsultationInTransaction(state.transaction as never, {
      eventId: 'event-1',
      userId: 'user-1',
      initiatedById: 'admin-1',
      durationMinutes: 30,
      eventStart: new Date('2026-07-20T10:00:00.000Z'),
      billing: {
        source: EventBillingSource.WALLET
      }
    });

    // Assert
    expect(state.getBalance().equals('70.00')).toBe(true);
    expect(state.walletEntries).toEqual([
      expect.objectContaining({
        amount: new Prisma.Decimal('-30.00'),
        balanceBefore: new Prisma.Decimal('100.00'),
        balanceAfter: new Prisma.Decimal('70.00'),
        type: WalletTransactionType.CONSULTATION_CHARGE
      })
    ]);
    expect(state.transaction.eventBillingAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chargedAmount: new Prisma.Decimal('30.00'),
        chargedMinutes: 30,
        source: EventBillingSource.WALLET
      })
    });
  });
});
