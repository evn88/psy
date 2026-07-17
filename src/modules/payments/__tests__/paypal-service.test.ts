import { PaymentKind, PaymentProvider, Prisma } from '@prisma/client';
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
  provider: PaymentProvider.PAYPAL,
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

describe('PayPal payment service', () => {
  let paymentStatus: string;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentStatus = 'CREATED';

    mocks.transaction.mockImplementation(
      async (
        callback: (client: {
          payment: typeof mocks.payment;
          user: typeof mocks.user;
        }) => Promise<unknown>
      ) =>
        callback({
          payment: mocks.payment,
          user: mocks.user
        })
    );

    mocks.payment.findUnique.mockImplementation(async () => ({
      ...basePayment,
      captureId: paymentStatus === 'COMPLETED' ? 'capture-1' : null,
      status: paymentStatus
    }));
    mocks.payment.updateMany.mockImplementation(async (args: { data: { status: string } }) => {
      if (paymentStatus === 'COMPLETED') {
        return { count: 0 };
      }

      paymentStatus = args.data.status;
      return { count: 1 };
    });
    mocks.payment.findUniqueOrThrow.mockImplementation(async () => ({
      ...basePayment,
      captureId: paymentStatus === 'COMPLETED' ? 'capture-1' : null,
      status: paymentStatus
    }));
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

    expect(mocks.payment.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.user.update).toHaveBeenCalledOnce();
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { balance: { increment: new Prisma.Decimal('25.00') } }
    });
  });

  it('не позволяет позднему событию понизить статус завершённого TOPUP', async () => {
    paymentStatus = 'COMPLETED';

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

    expect(mocks.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'payment-1',
          status: { not: 'COMPLETED' }
        }
      })
    );
    expect(mocks.user.update).not.toHaveBeenCalled();
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
    expect(mocks.user.update).toHaveBeenCalledOnce();
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
});
