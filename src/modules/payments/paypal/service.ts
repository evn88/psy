import { Prisma, type Payment, type PaymentKind } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getPayPalCapture, getPayPalOrder } from './client';
import type {
  PayPalCapture,
  PayPalMoney,
  PayPalOrder,
  PayPalPurchaseUnit,
  PayPalWebhookEvent
} from './types';

type PaymentReference = Pick<
  Payment,
  'id' | 'userId' | 'orderId' | 'captureId' | 'kind' | 'status' | 'servicePackageId'
>;

/**
 * Проверяет, что значение является объектом.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Возвращает строку из вложенного объекта по пути.
 */
const getNestedString = (value: unknown, path: string[]): string | undefined => {
  let current: unknown = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return typeof current === 'string' ? current : undefined;
};

/**
 * Преобразует произвольное JSON-значение в формат Prisma Json.
 */
const toPrismaJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

/**
 * Безопасно преобразует строку даты PayPal в Date.
 */
const parsePayPalDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Возвращает первую purchase unit заказа PayPal.
 */
export const getPrimaryPurchaseUnit = (
  order: Pick<PayPalOrder, 'purchase_units'>
): PayPalPurchaseUnit | null => {
  return order.purchase_units?.[0] ?? null;
};

/**
 * Возвращает первый capture из заказа PayPal.
 */
export const getPrimaryCaptureFromOrder = (
  order: Pick<PayPalOrder, 'purchase_units'>
): PayPalCapture | null => {
  return getPrimaryPurchaseUnit(order)?.payments?.captures?.[0] ?? null;
};

/**
 * Преобразует сумму PayPal в Prisma.Decimal.
 */
const parsePayPalMoney = (
  money?: PayPalMoney
): { amount: Prisma.Decimal; currency: string } | null => {
  if (!money?.value || !money.currency_code) {
    return null;
  }

  return {
    amount: new Prisma.Decimal(money.value),
    currency: money.currency_code
  };
};

/**
 * Находит локальный платёж по идентификаторам PayPal.
 */
const findPaymentByReferences = async (refs: {
  paymentId?: string;
  orderId?: string;
  captureId?: string;
  subscriptionId?: string;
}): Promise<PaymentReference | null> => {
  if (refs.paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: refs.paymentId },
      select: {
        id: true,
        userId: true,
        orderId: true,
        captureId: true,
        kind: true,
        status: true,
        servicePackageId: true
      }
    });

    if (payment) {
      return payment;
    }
  }

  if (refs.captureId) {
    const payment = await prisma.payment.findUnique({
      where: { captureId: refs.captureId },
      select: {
        id: true,
        userId: true,
        orderId: true,
        captureId: true,
        kind: true,
        status: true,
        servicePackageId: true
      }
    });

    if (payment) {
      return payment;
    }
  }

  if (refs.orderId) {
    const payment = await prisma.payment.findUnique({
      where: { orderId: refs.orderId },
      select: {
        id: true,
        userId: true,
        orderId: true,
        captureId: true,
        kind: true,
        status: true,
        servicePackageId: true
      }
    });

    if (payment) {
      return payment;
    }
  }

  if (refs.subscriptionId) {
    const payment = await prisma.payment.findFirst({
      where: { subscriptionId: refs.subscriptionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        orderId: true,
        captureId: true,
        kind: true,
        status: true,
        servicePackageId: true
      }
    });

    if (payment) {
      return payment;
    }
  }

  return null;
};

/**
 * Сохраняет или обновляет локальный платёж по данным order/capture из PayPal.
 */
export const syncPaymentFromPayPal = async (params: {
  order: PayPalOrder;
  capture?: PayPalCapture | null;
  userId?: string;
  paymentId?: string;
  kind?: PaymentKind;
  servicePackageId?: string;
}): Promise<Payment> => {
  const purchaseUnit = getPrimaryPurchaseUnit(params.order);
  const capture = params.capture ?? getPrimaryCaptureFromOrder(params.order);
  const money = parsePayPalMoney(capture?.amount ?? purchaseUnit?.amount);

  if (!money) {
    throw new Error(`Cannot resolve PayPal payment amount for order ${params.order.id}`);
  }

  const existingPayment = await findPaymentByReferences({
    paymentId: params.paymentId,
    orderId: params.order.id,
    captureId: capture?.id
  });

  const userId = params.userId ?? existingPayment?.userId;

  if (!userId) {
    throw new Error(`Cannot resolve local user for PayPal order ${params.order.id}`);
  }

  const paymentData = {
    provider: 'PAYPAL' as const,
    kind: params.kind ?? existingPayment?.kind ?? 'CHECKOUT',
    servicePackageId: params.servicePackageId ?? null,
    userId,
    orderId: params.order.id,
    captureId: capture?.id ?? existingPayment?.captureId ?? null,
    subscriptionId: null,
    invoiceId: purchaseUnit?.invoice_id ?? capture?.invoice_id ?? null,
    amount: money.amount,
    currency: money.currency,
    status: capture?.status ?? params.order.status,
    description: purchaseUnit?.description ?? null,
    payerEmail: params.order.payer?.email_address ?? null,
    rawOrder: toPrismaJson(params.order),
    rawCapture: capture ? toPrismaJson(capture) : Prisma.JsonNull,
    capturedAt: parsePayPalDate(capture?.create_time) ?? null,
    lastSyncedAt: new Date()
  };

  if (existingPayment) {
    if (
      existingPayment.status !== 'COMPLETED' &&
      paymentData.status === 'COMPLETED' &&
      paymentData.kind === 'TOPUP'
    ) {
      const [updatedPayment] = await prisma.$transaction([
        prisma.payment.update({
          where: { id: existingPayment.id },
          data: paymentData
        }),
        prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: paymentData.amount } }
        })
      ]);
      return updatedPayment;
    }

    return prisma.payment.update({
      where: { id: existingPayment.id },
      data: paymentData
    });
  }

  const createData = params.paymentId
    ? {
        id: params.paymentId,
        ...paymentData
      }
    : paymentData;

  if (paymentData.status === 'COMPLETED' && paymentData.kind === 'TOPUP') {
    const [createdPayment] = await prisma.$transaction([
      prisma.payment.create({ data: createData }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: paymentData.amount } }
      })
    ]);
    return createdPayment;
  }

  return prisma.payment.create({
    data: createData
  });
};

/**
 * Сверяет локальный платёж с PayPal API и обновляет запись в БД.
 */
export const syncPaymentWithPayPal = async (payment: PaymentReference): Promise<Payment> => {
  const capture =
    payment.captureId !== null && payment.captureId !== undefined
      ? await getPayPalCapture(payment.captureId)
      : null;
  const orderId = capture?.supplementary_data?.related_ids?.order_id || payment.orderId;
  const order = await getPayPalOrder(orderId);

  return syncPaymentFromPayPal({
    order,
    capture,
    paymentId: payment.id,
    userId: payment.userId,
    kind: payment.kind
  });
};

/**
 * Извлекает основные идентификаторы из webhook-события PayPal.
 */
const extractWebhookReferences = (event: PayPalWebhookEvent) => {
  const orderId = event.event_type.startsWith('CHECKOUT.ORDER.')
    ? getNestedString(event.resource, ['id'])
    : getNestedString(event.resource, ['supplementary_data', 'related_ids', 'order_id']);

  const captureId = event.event_type.startsWith('PAYMENT.CAPTURE.')
    ? getNestedString(event.resource, ['id'])
    : (getNestedString(event.resource, ['supplementary_data', 'related_ids', 'capture_id']) ??
      getNestedString(event.resource, ['disputed_transactions', '0', 'seller_transaction_id']));

  const subscriptionId = event.event_type.startsWith('BILLING.SUBSCRIPTION.')
    ? getNestedString(event.resource, ['id'])
    : undefined;

  const disputeId = event.event_type.startsWith('CUSTOMER.DISPUTE.')
    ? getNestedString(event.resource, ['dispute_id'])
    : undefined;

  return {
    orderId,
    captureId,
    subscriptionId,
    disputeId
  };
};

/**
 * Возвращает сумму и валюту из webhook-события PayPal.
 */
const extractWebhookMoney = (event: PayPalWebhookEvent): PayPalMoney | undefined => {
  if (
    event.event_type.startsWith('PAYMENT.CAPTURE.') ||
    event.event_type.startsWith('PAYMENT.REFUND.')
  ) {
    const amountValue = getNestedString(event.resource, ['amount', 'value']);
    const currencyCode = getNestedString(event.resource, ['amount', 'currency_code']);

    if (amountValue && currencyCode) {
      return {
        value: amountValue,
        currency_code: currencyCode
      };
    }
  }

  if (event.event_type.startsWith('CUSTOMER.DISPUTE.')) {
    const amountValue = getNestedString(event.resource, ['dispute_amount', 'value']);
    const currencyCode = getNestedString(event.resource, ['dispute_amount', 'currency_code']);

    if (amountValue && currencyCode) {
      return {
        value: amountValue,
        currency_code: currencyCode
      };
    }
  }

  return undefined;
};

/**
 * Создаёт или обновляет запись о споре из webhook-события PayPal.
 */
const upsertDisputeFromWebhook = async (params: {
  event: PayPalWebhookEvent;
  paymentId?: string;
  disputeId?: string;
}): Promise<void> => {
  if (!params.disputeId) {
    return;
  }

  const money = extractWebhookMoney(params.event);

  await prisma.paymentDispute.upsert({
    where: { disputeId: params.disputeId },
    update: {
      paymentId: params.paymentId ?? null,
      stage: getNestedString(params.event.resource, ['dispute_life_cycle_stage']) ?? null,
      status: getNestedString(params.event.resource, ['status']) ?? 'UNKNOWN',
      reason: getNestedString(params.event.resource, ['reason']) ?? null,
      amount: money ? new Prisma.Decimal(money.value) : undefined,
      currency: money?.currency_code ?? null,
      responseDueAt:
        parsePayPalDate(getNestedString(params.event.resource, ['update_time'])) ?? undefined,
      payload: toPrismaJson(params.event.resource)
    },
    create: {
      paymentId: params.paymentId ?? null,
      disputeId: params.disputeId,
      stage: getNestedString(params.event.resource, ['dispute_life_cycle_stage']) ?? null,
      status: getNestedString(params.event.resource, ['status']) ?? 'UNKNOWN',
      reason: getNestedString(params.event.resource, ['reason']) ?? null,
      amount: money ? new Prisma.Decimal(money.value) : undefined,
      currency: money?.currency_code ?? null,
      responseDueAt:
        parsePayPalDate(getNestedString(params.event.resource, ['update_time'])) ?? undefined,
      payload: toPrismaJson(params.event.resource)
    }
  });
};

/**
 * Обрабатывает подтверждённый webhook PayPal и синхронизирует локальные сущности.
 */
export const processPayPalWebhookEvent = async (event: PayPalWebhookEvent): Promise<void> => {
  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { providerEventId: event.id }
  });

  if (existingEvent?.isProcessed) {
    return;
  }

  const references = extractWebhookReferences(event);
  const money = extractWebhookMoney(event);
  const payment = await findPaymentByReferences(references);

  if (
    payment &&
    (event.event_type.startsWith('PAYMENT.') || event.event_type.startsWith('CHECKOUT.ORDER.'))
  ) {
    await syncPaymentWithPayPal(payment);
  } else if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: getNestedString(event.resource, ['status']) ?? undefined,
        lastSyncedAt: new Date()
      }
    });
  }

  if (event.event_type.startsWith('CUSTOMER.DISPUTE.')) {
    await upsertDisputeFromWebhook({
      event,
      paymentId: payment?.id,
      disputeId: references.disputeId
    });
  }

  await prisma.paymentEvent.upsert({
    where: { providerEventId: event.id },
    update: {
      paymentId: payment?.id ?? null,
      eventType: event.event_type,
      resourceType: event.resource_type ?? null,
      resourceId: getNestedString(event.resource, ['id']) ?? null,
      orderId: references.orderId ?? null,
      captureId: references.captureId ?? null,
      subscriptionId: references.subscriptionId ?? null,
      disputeId: references.disputeId ?? null,
      status: getNestedString(event.resource, ['status']) ?? null,
      amount: money ? new Prisma.Decimal(money.value) : undefined,
      currency: money?.currency_code ?? null,
      occurredAt: parsePayPalDate(event.create_time) ?? undefined,
      payload: toPrismaJson(event),
      isProcessed: true,
      processedAt: new Date()
    },
    create: {
      provider: 'PAYPAL',
      paymentId: payment?.id ?? null,
      providerEventId: event.id,
      eventType: event.event_type,
      resourceType: event.resource_type ?? null,
      resourceId: getNestedString(event.resource, ['id']) ?? null,
      orderId: references.orderId ?? null,
      captureId: references.captureId ?? null,
      subscriptionId: references.subscriptionId ?? null,
      disputeId: references.disputeId ?? null,
      status: getNestedString(event.resource, ['status']) ?? null,
      amount: money ? new Prisma.Decimal(money.value) : undefined,
      currency: money?.currency_code ?? null,
      occurredAt: parsePayPalDate(event.create_time) ?? undefined,
      payload: toPrismaJson(event),
      isProcessed: true,
      processedAt: new Date()
    }
  });
};
