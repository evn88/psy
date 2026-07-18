import { PaymentKind, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const payment = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  };
  const paymentEvent = {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  };
  const user = {
    update: vi.fn()
  };

  return {
    getPayPalCapture: vi.fn(),
    getPayPalOrder: vi.fn(),
    fulfillDirectPackagePurchase: vi.fn(),
    recordProviderRefund: vi.fn(),
    recordTopupCredit: vi.fn(),
    payment,
    paymentDispute: {
      upsert: vi.fn()
    },
    paymentEvent,
    transaction: vi.fn(),
    user
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    payment: mocks.payment,
    paymentDispute: mocks.paymentDispute,
    paymentEvent: mocks.paymentEvent,
    user: mocks.user,
    $transaction: mocks.transaction
  }
}));

vi.mock('server-only', () => ({}));

vi.mock('@/modules/payments/financial/financial-service.server', () => ({
  fulfillDirectPackagePurchase: mocks.fulfillDirectPackagePurchase,
  recordProviderRefund: mocks.recordProviderRefund,
  recordTopupCredit: mocks.recordTopupCredit
}));

vi.mock('@/modules/payments/paypal/client', () => ({
  getPayPalCapture: mocks.getPayPalCapture,
  getPayPalOrder: mocks.getPayPalOrder
}));

import {
  processPayPalWebhookEvent,
  syncPaymentFromPayPal
} from '@/modules/payments/paypal/service';
import type { PayPalOrder, PayPalWebhookEvent } from '@/modules/payments/paypal/types';

const basePayment = {
  id: 'payment-1',
  provider: 'PAYPAL',
  kind: PaymentKind.TOPUP,
  userId: 'user-1',
  orderId: 'order-1',
  captureId: null,
  subscriptionId: null,
  invoiceId: null,
  amount: new Prisma.Decimal('25.00'),
  currency: 'EUR',
  status: 'CREATED',
  description: 'Пополнение баланса',
  payerEmail: null,
  rawOrder: null,
  rawCapture: null,
  capturedAt: null,
  balanceCreditedAt: null,
  refundedAmount: new Prisma.Decimal(0),
  lastSyncedAt: null,
  createdAt: new Date('2026-07-17T10:00:00.000Z'),
  updatedAt: new Date('2026-07-17T10:00:00.000Z'),
  servicePackageId: null
};

const completedOrder: PayPalOrder = {
  id: 'order-1',
  status: 'COMPLETED',
  purchase_units: [
    {
      amount: {
        value: '25.00',
        currency_code: 'EUR'
      },
      payments: {
        captures: [
          {
            id: 'capture-1',
            status: 'COMPLETED',
            amount: {
              value: '25.00',
              currency_code: 'EUR'
            }
          }
        ]
      }
    }
  ]
};

const webhookEvent: PayPalWebhookEvent = {
  id: 'webhook-1',
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  resource_type: 'capture',
  create_time: '2026-07-17T10:05:00.000Z',
  resource: {
    id: 'capture-1',
    status: 'COMPLETED',
    amount: {
      value: '25.00',
      currency_code: 'EUR'
    },
    supplementary_data: {
      related_ids: {
        order_id: 'order-1'
      }
    }
  }
};

const createRefundWebhookEvent = ({
  amount,
  eventId = 'refund-webhook-1',
  eventType = 'PAYMENT.CAPTURE.REFUNDED',
  resourceType = 'refund'
}: {
  amount: string;
  eventId?: string;
  eventType?: string;
  resourceType?: string;
}): PayPalWebhookEvent => ({
  id: eventId,
  event_type: eventType,
  resource_type: resourceType,
  create_time: '2026-07-17T11:00:00.000Z',
  resource: {
    id: resourceType === 'capture' ? 'capture-1' : `refund-${eventId}`,
    status: 'COMPLETED',
    amount: {
      value: amount,
      currency_code: 'EUR'
    },
    supplementary_data: {
      related_ids: {
        ...(resourceType === 'refund' ? { capture_id: 'capture-1' } : {}),
        order_id: 'order-1'
      }
    }
  }
});

describe('PayPal payment service', () => {
  let paymentStatus: string;
  let balanceCreditedAt: Date | null;
  let refundedAmount: Prisma.Decimal;
  let transactionQueue: Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentStatus = 'CREATED';
    balanceCreditedAt = null;
    refundedAmount = new Prisma.Decimal(0);
    transactionQueue = Promise.resolve();

    mocks.transaction.mockImplementation(
      async (
        callback: (client: {
          payment: typeof mocks.payment;
          paymentEvent: typeof mocks.paymentEvent;
          user: typeof mocks.user;
        }) => Promise<unknown>
      ) => {
        const transaction = transactionQueue.then(() =>
          callback({
            payment: mocks.payment,
            paymentEvent: mocks.paymentEvent,
            user: mocks.user
          })
        );
        transactionQueue = transaction.catch(() => undefined);
        return transaction;
      }
    );

    const getStoredPayment = () => ({
      ...basePayment,
      balanceCreditedAt,
      captureId: balanceCreditedAt ? 'capture-1' : null,
      refundedAmount,
      status: paymentStatus
    });

    mocks.payment.findUnique.mockImplementation(async () => getStoredPayment());
    mocks.payment.findUniqueOrThrow.mockImplementation(async () => getStoredPayment());
    mocks.payment.update.mockImplementation(
      async (args: {
        data: {
          balanceCreditedAt?: Date | null;
          refundedAmount?: Prisma.Decimal;
          status?: string;
        };
      }) => {
        if (args.data.status) {
          paymentStatus = args.data.status;
        }
        if (args.data.balanceCreditedAt !== undefined) {
          balanceCreditedAt = args.data.balanceCreditedAt;
        }
        if (args.data.refundedAmount) {
          refundedAmount = args.data.refundedAmount;
        }

        return getStoredPayment();
      }
    );
    mocks.payment.updateMany.mockResolvedValue({ count: 1 });
    mocks.paymentEvent.updateMany.mockResolvedValue({ count: 1 });
    mocks.paymentEvent.update.mockResolvedValue({ id: 'event-1', isProcessed: true });
    mocks.user.update.mockResolvedValue({ id: 'user-1' });
  });

  it('зачисляет TOPUP ровно один раз при параллельной синхронизации', async () => {
    await Promise.all([
      syncPaymentFromPayPal({
        order: completedOrder,
        userId: 'user-1',
        kind: PaymentKind.TOPUP
      }),
      syncPaymentFromPayPal({
        order: completedOrder,
        userId: 'user-1',
        kind: PaymentKind.TOPUP
      })
    ]);

    expect(mocks.payment.update).toHaveBeenCalledTimes(2);
    expect(mocks.recordTopupCredit).toHaveBeenCalledOnce();
    expect(mocks.recordTopupCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: new Prisma.Decimal('25.00'),
        provider: 'PAYPAL'
      })
    );
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable'
    });
  });

  it('не позволяет позднему событию понизить статус завершённого TOPUP', async () => {
    paymentStatus = 'COMPLETED';
    balanceCreditedAt = new Date('2026-07-17T10:05:00.000Z');

    await syncPaymentFromPayPal({
      order: {
        ...completedOrder,
        status: 'APPROVED',
        purchase_units: [
          {
            amount: {
              value: '25.00',
              currency_code: 'EUR'
            }
          }
        ]
      },
      userId: 'user-1',
      kind: PaymentKind.TOPUP
    });

    expect(mocks.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED'
        })
      })
    );
    expect(mocks.recordTopupCredit).not.toHaveBeenCalled();
    expect(paymentStatus).toBe('COMPLETED');
  });

  it('обрабатывает одинаковый параллельный webhook только одним обработчиком', async () => {
    let storedEvent:
      | {
          id: string;
          isProcessed: boolean;
          processedAt: Date | null;
        }
      | undefined;

    mocks.paymentEvent.create.mockImplementation(
      async (args: { data: { isProcessed: boolean; processedAt: Date } }) => {
        if (storedEvent) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test'
          });
        }

        storedEvent = {
          id: 'event-1',
          isProcessed: args.data.isProcessed,
          processedAt: args.data.processedAt
        };
        return { id: storedEvent.id };
      }
    );
    mocks.paymentEvent.findUnique.mockImplementation(async () => storedEvent);
    mocks.paymentEvent.update.mockImplementation(
      async (args: { data: { isProcessed: boolean; processedAt: Date } }) => {
        storedEvent = {
          id: 'event-1',
          isProcessed: args.data.isProcessed,
          processedAt: args.data.processedAt
        };
        return storedEvent;
      }
    );
    mocks.getPayPalCapture.mockResolvedValue({
      id: 'capture-1',
      status: 'COMPLETED',
      amount: {
        value: '25.00',
        currency_code: 'EUR'
      },
      supplementary_data: {
        related_ids: {
          order_id: 'order-1'
        }
      }
    });
    mocks.getPayPalOrder.mockResolvedValue(completedOrder);

    await Promise.all([
      processPayPalWebhookEvent(webhookEvent),
      processPayPalWebhookEvent(webhookEvent)
    ]);

    expect(mocks.getPayPalOrder).toHaveBeenCalledOnce();
    expect(mocks.recordTopupCredit).toHaveBeenCalledOnce();
    expect(storedEvent?.isProcessed).toBe(true);
  });

  it('освобождает webhook claim после ошибки и успешно обрабатывает retry', async () => {
    let storedEvent:
      | {
          id: string;
          isProcessed: boolean;
          processedAt: Date | null;
        }
      | undefined;

    mocks.paymentEvent.create.mockImplementation(
      async (args: { data: { isProcessed: boolean; processedAt: Date } }) => {
        if (storedEvent) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test'
          });
        }

        storedEvent = {
          id: 'event-1',
          isProcessed: args.data.isProcessed,
          processedAt: args.data.processedAt
        };
        return { id: storedEvent.id };
      }
    );
    mocks.paymentEvent.findUnique.mockImplementation(async () => storedEvent);
    mocks.paymentEvent.updateMany.mockImplementation(
      async (args: { data: { processedAt: Date | null }; where: { processedAt: Date | null } }) => {
        if (
          !storedEvent ||
          storedEvent.processedAt?.getTime() !== args.where.processedAt?.getTime()
        ) {
          return { count: 0 };
        }

        storedEvent = {
          ...storedEvent,
          processedAt: args.data.processedAt
        };
        return { count: 1 };
      }
    );
    mocks.paymentEvent.update.mockImplementation(
      async (args: { data: { isProcessed: boolean; processedAt: Date } }) => {
        storedEvent = {
          id: 'event-1',
          isProcessed: args.data.isProcessed,
          processedAt: args.data.processedAt
        };
        return storedEvent;
      }
    );
    mocks.getPayPalCapture.mockResolvedValue({
      id: 'capture-1',
      status: 'COMPLETED',
      supplementary_data: {
        related_ids: {
          order_id: 'order-1'
        }
      }
    });
    mocks.getPayPalOrder
      .mockRejectedValueOnce(new Error('PayPal unavailable'))
      .mockResolvedValueOnce(completedOrder);

    await expect(processPayPalWebhookEvent(webhookEvent)).rejects.toThrow('PayPal unavailable');
    expect(storedEvent?.processedAt).toBeNull();
    expect(storedEvent?.isProcessed).toBe(false);

    await processPayPalWebhookEvent(webhookEvent);

    expect(mocks.getPayPalOrder).toHaveBeenCalledTimes(2);
    expect(storedEvent?.isProcessed).toBe(true);
  });

  it('применяет частичный refund к TOPUP ровно один раз', async () => {
    // Arrange
    paymentStatus = 'COMPLETED';
    balanceCreditedAt = new Date('2026-07-17T10:05:00.000Z');
    const event = createRefundWebhookEvent({ amount: '10.00' });
    let storedEvent:
      | {
          id: string;
          isProcessed: boolean;
          processedAt: Date | null;
        }
      | undefined;

    mocks.paymentEvent.create.mockImplementation(
      async (args: { data: { isProcessed: boolean; processedAt: Date } }) => {
        if (storedEvent) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test'
          });
        }

        storedEvent = {
          id: 'refund-event-1',
          isProcessed: args.data.isProcessed,
          processedAt: args.data.processedAt
        };
        return { id: storedEvent.id };
      }
    );
    mocks.paymentEvent.findUnique.mockImplementation(async () => storedEvent);
    mocks.paymentEvent.update.mockImplementation(
      async (args: { data: { isProcessed: boolean; processedAt: Date } }) => {
        storedEvent = {
          id: 'refund-event-1',
          isProcessed: args.data.isProcessed,
          processedAt: args.data.processedAt
        };
        return storedEvent;
      }
    );

    // Act
    await processPayPalWebhookEvent(event);
    await processPayPalWebhookEvent(event);

    // Assert
    expect(mocks.recordProviderRefund).toHaveBeenCalledOnce();
    expect(mocks.recordProviderRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        refundDelta: new Prisma.Decimal('10.00'),
        totalRefundedAmount: new Prisma.Decimal('10.00')
      })
    );
    expect(refundedAmount.equals(new Prisma.Decimal('10.00'))).toBe(true);
    expect(paymentStatus).toBe('PARTIALLY_REFUNDED');
    expect(mocks.payment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_captureId: {
            provider: 'PAYPAL',
            captureId: 'capture-1'
          }
        }
      })
    );
    expect(mocks.getPayPalCapture).not.toHaveBeenCalled();
    expect(mocks.getPayPalOrder).not.toHaveBeenCalled();
    expect(storedEvent?.isProcessed).toBe(true);
  });

  it('учитывает refund до capture и зачисляет только невозвращённый остаток', async () => {
    // Arrange
    mocks.paymentEvent.create.mockResolvedValueOnce({ id: 'refund-event-1' });
    const refundEvent = createRefundWebhookEvent({ amount: '10.00' });

    // Act
    await processPayPalWebhookEvent(refundEvent);
    await syncPaymentFromPayPal({
      order: completedOrder,
      userId: 'user-1',
      kind: PaymentKind.TOPUP
    });

    // Assert
    expect(mocks.recordTopupCredit).toHaveBeenCalledOnce();
    expect(mocks.recordTopupCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: new Prisma.Decimal('15.00')
      })
    );
    expect(refundedAmount.equals(new Prisma.Decimal('10.00'))).toBe(true);
    expect(paymentStatus).toBe('PARTIALLY_REFUNDED');
    expect(balanceCreditedAt).toBeInstanceOf(Date);
  });

  it('ограничивает reversal некомпенсированным остатком платежа', async () => {
    // Arrange
    paymentStatus = 'PARTIALLY_REFUNDED';
    balanceCreditedAt = new Date('2026-07-17T10:05:00.000Z');
    refundedAmount = new Prisma.Decimal('10.00');
    mocks.paymentEvent.create.mockResolvedValueOnce({ id: 'reversal-event-1' });
    const reversalEvent = createRefundWebhookEvent({
      amount: '25.00',
      eventType: 'PAYMENT.CAPTURE.REVERSED',
      resourceType: 'capture'
    });

    // Act
    await processPayPalWebhookEvent(reversalEvent);

    // Assert
    expect(mocks.recordProviderRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        refundDelta: new Prisma.Decimal('15.00'),
        totalRefundedAmount: new Prisma.Decimal('25.00')
      })
    );
    expect(refundedAmount.equals(new Prisma.Decimal('25.00'))).toBe(true);
    expect(paymentStatus).toBe('REVERSED');
  });
});
