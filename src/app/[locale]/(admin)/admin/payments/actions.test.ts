import { PaymentKind, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  getPaymentService: vi.fn(),
  paymentExists: vi.fn(),
  refundPayment: vi.fn(),
  revalidatePath: vi.fn(),
  writeSystemLogEntry: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock('@/auth', () => ({
  auth: mocks.auth
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    consultationRate: {
      upsert: vi.fn()
    },
    payment: {
      deleteMany: mocks.deleteMany,
      findUnique: mocks.findUnique
    }
  }
}));

vi.mock('@/modules/payments/factory', () => ({
  getPaymentService: mocks.getPaymentService
}));

vi.mock('@/modules/payments/financial/financial-service.server', () => ({
  adjustPurchasedPackage: vi.fn(),
  adjustWalletBalance: vi.fn()
}));

vi.mock('@/modules/system-logs/system-log-service.server', () => ({
  writeSystemLogEntry: mocks.writeSystemLogEntry
}));

import {
  deleteOrphanPaymentAction,
  refundPaymentAction
} from '@/app/[locale]/(admin)/admin/payments/actions';

const idempotencyKey = '00000000-0000-4000-8000-000000000001';
const completedTopup = {
  amount: new Prisma.Decimal('50.00'),
  balanceCreditedAt: new Date('2026-07-20T10:00:00.000Z'),
  captureId: null,
  currency: 'EUR',
  fulfilledAt: new Date('2026-07-20T10:00:00.000Z'),
  id: 'payment-1',
  kind: PaymentKind.TOPUP,
  orderId: 'order-1',
  provider: 'STRIPE',
  refundedAmount: new Prisma.Decimal('0.00'),
  servicePackageId: null,
  status: 'succeeded',
  userId: 'user-1'
};

describe('административные действия с платежами', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'ADMIN'
      }
    });
    mocks.getPaymentService.mockResolvedValue({
      paymentExists: mocks.paymentExists,
      refundPayment: mocks.refundPayment
    });
  });

  it('возвращает завершённое пополнение через исходного провайдера', async () => {
    mocks.findUnique.mockResolvedValue(completedTopup);
    mocks.refundPayment.mockResolvedValue(completedTopup);

    const result = await refundPaymentAction('payment-1', idempotencyKey);

    expect(result.success).toBe(true);
    expect(mocks.getPaymentService).toHaveBeenCalledWith('STRIPE');
    expect(mocks.refundPayment).toHaveBeenCalledWith({
      payment: completedTopup,
      amount: '50.00',
      idempotencyKey: `admin-refund:payment-1:${idempotencyKey}`
    });
  });

  it('не разрешает provider refund для внутренней покупки пакета', async () => {
    mocks.findUnique.mockResolvedValue({
      ...completedTopup,
      kind: PaymentKind.CHECKOUT
    });

    const result = await refundPaymentAction('payment-1', idempotencyKey);

    expect(result).toEqual({
      success: false,
      message: 'Возврат доступен только для завершённого пополнения через платёжный шлюз'
    });
    expect(mocks.refundPayment).not.toHaveBeenCalled();
  });

  it('удаляет локальную запись только после подтверждённого отсутствия у провайдера', async () => {
    mocks.findUnique.mockResolvedValue({
      ...completedTopup,
      balanceCreditedAt: null,
      captureId: null,
      capturedAt: null,
      fulfilledAt: null,
      status: 'CREATED',
      _count: {
        disputes: 0,
        events: 0,
        financialOperations: 0
      }
    });
    mocks.paymentExists.mockResolvedValue(false);
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteOrphanPaymentAction('payment-1');

    expect(result.success).toBe(true);
    expect(mocks.paymentExists).toHaveBeenCalledOnce();
    expect(mocks.deleteMany).toHaveBeenCalledOnce();
    expect(mocks.writeSystemLogEntry).toHaveBeenCalledOnce();
  });

  it('не удаляет запись, если провайдер подтверждает существование платежа', async () => {
    mocks.findUnique.mockResolvedValue({
      ...completedTopup,
      balanceCreditedAt: null,
      captureId: null,
      capturedAt: null,
      fulfilledAt: null,
      status: 'CREATED',
      _count: {
        disputes: 0,
        events: 0,
        financialOperations: 0
      }
    });
    mocks.paymentExists.mockResolvedValue(true);

    const result = await deleteOrphanPaymentAction('payment-1');

    expect(result.success).toBe(false);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
