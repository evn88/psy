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

const COMPLETED_STATUS = 'COMPLETED';
const WEBHOOK_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const PAYMENT_TRANSACTION_RETRY_LIMIT = 3;
const CAPTURED_PAYMENT_STATUSES = new Set([
  COMPLETED_STATUS,
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'REVERSED'
]);
const FULL_REFUND_STATUSES = new Set(['REFUNDED', 'REVERSED']);
const REFUND_EVENT_TYPES = new Set([
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
  'PAYMENT.REFUND.COMPLETED'
]);

const paymentReferenceSelect = {
  id: true,
  userId: true,
  orderId: true,
  captureId: true,
  kind: true,
  status: true,
  servicePackageId: true,
  amount: true,
  currency: true,
  balanceCreditedAt: true,
  refundedAmount: true
} satisfies Prisma.PaymentSelect;

type PaymentReference = Prisma.PaymentGetPayload<{
  select: typeof paymentReferenceSelect;
}>;

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
 * Проверяет, что ошибка вызвана конфликтом уникального ограничения Prisma.
 */
const isUniqueConstraintError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
};

/**
 * Проверяет конфликт сериализации Prisma, который можно безопасно повторить.
 */
const isTransactionWriteConflict = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
};

/**
 * Выполняет короткую финансовую транзакцию с повтором конфликтов сериализации.
 */
const runSerializablePaymentTransaction = async <T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  for (let attempt = 1; attempt <= PAYMENT_TRANSACTION_RETRY_LIMIT; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error: unknown) {
      if (!isTransactionWriteConflict(error) || attempt === PAYMENT_TRANSACTION_RETRY_LIMIT) {
        throw error;
      }
    }
  }

  throw new Error('Payment transaction retry limit exceeded');
};

/**
 * Возвращает статус платежа с учётом уже подтверждённых возвратов.
 */
const getRefundAwarePaymentStatus = (
  amount: Prisma.Decimal,
  refundedAmount: Prisma.Decimal,
  fallbackStatus: string
): string => {
  if (refundedAmount.greaterThanOrEqualTo(amount)) {
    return fallbackStatus === 'REVERSED' ? 'REVERSED' : 'REFUNDED';
  }

  if (refundedAmount.greaterThan(0)) {
    return 'PARTIALLY_REFUNDED';
  }

  return fallbackStatus;
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
      select: paymentReferenceSelect
    });

    if (payment) {
      return payment;
    }
  }

  if (refs.captureId) {
    const payment = await prisma.payment.findUnique({
      where: {
        provider_captureId: {
          provider: 'PAYPAL',
          captureId: refs.captureId
        }
      },
      select: paymentReferenceSelect
    });

    if (payment) {
      return payment;
    }
  }

  if (refs.orderId) {
    const payment = await prisma.payment.findUnique({
      where: {
        provider_orderId: {
          provider: 'PAYPAL',
          orderId: refs.orderId
        }
      },
      select: paymentReferenceSelect
    });

    if (payment) {
      return payment;
    }
  }

  if (refs.subscriptionId) {
    const payment = await prisma.payment.findFirst({
      where: { subscriptionId: refs.subscriptionId },
      orderBy: { createdAt: 'desc' },
      select: paymentReferenceSelect
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
    servicePackageId: params.servicePackageId ?? existingPayment?.servicePackageId ?? null,
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
    if (paymentData.kind === 'TOPUP') {
      return runSerializablePaymentTransaction(async transaction => {
        const currentPayment = await transaction.payment.findUniqueOrThrow({
          where: { id: existingPayment.id },
          select: paymentReferenceSelect
        });
        const isCapturedLifecycle = CAPTURED_PAYMENT_STATUSES.has(paymentData.status);
        const currentRefundedAmount = currentPayment.refundedAmount.greaterThan(paymentData.amount)
          ? paymentData.amount
          : currentPayment.refundedAmount;
        const refundedAmount = FULL_REFUND_STATUSES.has(paymentData.status)
          ? paymentData.amount
          : currentRefundedAmount;
        const shouldApplyInitialCredit =
          currentPayment.balanceCreditedAt === null && isCapturedLifecycle;
        const creditAmount = shouldApplyInitialCredit
          ? paymentData.amount.minus(refundedAmount)
          : new Prisma.Decimal(0);
        const refundAdjustment = currentPayment.balanceCreditedAt
          ? refundedAmount.minus(currentRefundedAmount)
          : new Prisma.Decimal(0);
        const balanceDelta = creditAmount.minus(refundAdjustment);
        const fallbackStatus =
          currentPayment.balanceCreditedAt && !isCapturedLifecycle
            ? currentPayment.status
            : paymentData.status;
        const status = getRefundAwarePaymentStatus(
          paymentData.amount,
          refundedAmount,
          fallbackStatus
        );
        const updatedPayment = await transaction.payment.update({
          where: { id: existingPayment.id },
          data: {
            ...paymentData,
            status,
            refundedAmount,
            balanceCreditedAt:
              currentPayment.balanceCreditedAt ?? (isCapturedLifecycle ? new Date() : null)
          }
        });

        if (balanceDelta.greaterThan(0)) {
          await transaction.user.update({
            where: { id: userId },
            data: { balance: { increment: balanceDelta } }
          });
        } else if (balanceDelta.lessThan(0)) {
          await transaction.user.update({
            where: { id: userId },
            data: { balance: { decrement: balanceDelta.abs() } }
          });
        }

        return updatedPayment;
      });
    }

    return prisma.payment.update({
      where: { id: existingPayment.id },
      data: paymentData
    });
  }

  const isInitialCapturedTopup =
    paymentData.kind === 'TOPUP' && CAPTURED_PAYMENT_STATUSES.has(paymentData.status);
  const initialRefundedAmount =
    paymentData.kind === 'TOPUP' && FULL_REFUND_STATUSES.has(paymentData.status)
      ? paymentData.amount
      : new Prisma.Decimal(0);
  const createData = params.paymentId
    ? {
        id: params.paymentId,
        ...paymentData,
        ...(paymentData.kind === 'TOPUP'
          ? {
              balanceCreditedAt: isInitialCapturedTopup ? new Date() : null,
              refundedAmount: initialRefundedAmount
            }
          : {})
      }
    : {
        ...paymentData,
        ...(paymentData.kind === 'TOPUP'
          ? {
              balanceCreditedAt: isInitialCapturedTopup ? new Date() : null,
              refundedAmount: initialRefundedAmount
            }
          : {})
      };

  try {
    if (paymentData.kind === 'TOPUP') {
      return await runSerializablePaymentTransaction(async transaction => {
        const createdPayment = await transaction.payment.create({ data: createData });
        const creditAmount = isInitialCapturedTopup
          ? paymentData.amount.minus(initialRefundedAmount)
          : new Prisma.Decimal(0);

        if (creditAmount.greaterThan(0)) {
          await transaction.user.update({
            where: { id: userId },
            data: { balance: { increment: creditAmount } }
          });
        }

        return createdPayment;
      });
    }

    return await prisma.payment.create({
      data: createData
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const concurrentPayment = await findPaymentByReferences({
      paymentId: params.paymentId,
      orderId: params.order.id,
      captureId: capture?.id
    });

    if (!concurrentPayment) {
      throw error;
    }

    return syncPaymentFromPayPal(params);
  }
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
 * Проверяет, что webhook подтверждает состоявшийся возврат или reversal.
 */
const isRefundAdjustmentEventType = (eventType: string): boolean => {
  return REFUND_EVENT_TYPES.has(eventType);
};

/**
 * Извлекает основные идентификаторы из webhook-события PayPal.
 */
const extractWebhookReferences = (event: PayPalWebhookEvent) => {
  const orderId = event.event_type.startsWith('CHECKOUT.ORDER.')
    ? getNestedString(event.resource, ['id'])
    : getNestedString(event.resource, ['supplementary_data', 'related_ids', 'order_id']);

  const relatedCaptureId = getNestedString(event.resource, [
    'supplementary_data',
    'related_ids',
    'capture_id'
  ]);
  const isRefundResource =
    isRefundAdjustmentEventType(event.event_type) ||
    event.event_type.startsWith('PAYMENT.REFUND.') ||
    event.resource_type === 'refund';
  const captureId = isRefundResource
    ? (relatedCaptureId ??
      getNestedString(event.resource, ['capture_id']) ??
      (event.resource_type === 'capture' ? getNestedString(event.resource, ['id']) : undefined))
    : event.event_type.startsWith('PAYMENT.CAPTURE.')
      ? getNestedString(event.resource, ['id'])
      : (relatedCaptureId ??
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

type WebhookClaim = {
  id: string;
  claimedAt: Date;
};

/**
 * Формирует общие поля журнала webhook без состояния обработки.
 */
const getWebhookEventData = (
  event: PayPalWebhookEvent,
  references: ReturnType<typeof extractWebhookReferences>,
  money: PayPalMoney | undefined
) => {
  return {
    provider: 'PAYPAL' as const,
    providerEventId: event.id,
    eventType: event.event_type,
    resourceType: event.resource_type ?? null,
    resourceId: getNestedString(event.resource, ['id']) ?? null,
    orderId: references.orderId ?? null,
    captureId: references.captureId ?? null,
    subscriptionId: references.subscriptionId ?? null,
    disputeId: references.disputeId ?? null,
    status: getNestedString(event.resource, ['status']) ?? null,
    amount: money ? new Prisma.Decimal(money.value) : null,
    currency: money?.currency_code ?? null,
    occurredAt: parsePayPalDate(event.create_time) ?? null,
    payload: toPrismaJson(event)
  };
};

/**
 * Атомарно закрепляет webhook за одним обработчиком.
 * Незавершённый claim освобождается при ошибке, а зависший может быть занят повторно.
 */
const claimPayPalWebhookEvent = async (
  event: PayPalWebhookEvent,
  references: ReturnType<typeof extractWebhookReferences>,
  money: PayPalMoney | undefined
): Promise<WebhookClaim | null> => {
  const claimedAt = new Date();
  const eventData = getWebhookEventData(event, references, money);

  try {
    const createdEvent = await prisma.paymentEvent.create({
      data: {
        ...eventData,
        isProcessed: false,
        processedAt: claimedAt
      },
      select: { id: true }
    });

    return {
      id: createdEvent.id,
      claimedAt
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }

  const existingEvent = await prisma.paymentEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: 'PAYPAL',
        providerEventId: event.id
      }
    },
    select: {
      id: true,
      isProcessed: true,
      processedAt: true
    }
  });

  if (!existingEvent || existingEvent.isProcessed) {
    return null;
  }

  const claimIsActive =
    existingEvent.processedAt !== null &&
    claimedAt.getTime() - existingEvent.processedAt.getTime() < WEBHOOK_CLAIM_TIMEOUT_MS;

  if (claimIsActive) {
    return null;
  }

  const claimedEvent = await prisma.paymentEvent.updateMany({
    where: {
      id: existingEvent.id,
      isProcessed: false,
      processedAt: existingEvent.processedAt
    },
    data: {
      ...eventData,
      processedAt: claimedAt
    }
  });

  return claimedEvent.count === 1
    ? {
        id: existingEvent.id,
        claimedAt
      }
    : null;
};

/**
 * Атомарно применяет подтверждённый refund/reversal к платежу и балансу.
 * Claim webhook, накопленная сумма возврата и корректировка баланса фиксируются
 * в одной serializable-транзакции, поэтому повторная доставка не меняет баланс дважды.
 */
const applyRefundAdjustmentFromWebhook = async (params: {
  event: PayPalWebhookEvent;
  references: ReturnType<typeof extractWebhookReferences>;
  money: PayPalMoney | undefined;
  payment: PaymentReference;
  claim: WebhookClaim;
}): Promise<void> => {
  const refundMoney = parsePayPalMoney(params.money);

  if (!refundMoney || !refundMoney.amount.greaterThan(0)) {
    throw new Error(`PayPal refund ${params.event.id} does not contain a positive amount`);
  }

  await runSerializablePaymentTransaction(async transaction => {
    const eventClaim = await transaction.paymentEvent.updateMany({
      where: {
        id: params.claim.id,
        isProcessed: false,
        processedAt: params.claim.claimedAt
      },
      data: {
        paymentId: params.payment.id
      }
    });

    if (eventClaim.count === 0) {
      return;
    }

    const currentPayment = await transaction.payment.findUniqueOrThrow({
      where: { id: params.payment.id },
      select: paymentReferenceSelect
    });

    if (currentPayment.currency.toUpperCase() !== refundMoney.currency.toUpperCase()) {
      throw new Error(
        `PayPal refund ${params.event.id} currency does not match payment ${currentPayment.id}`
      );
    }

    const currentRefundedAmount = currentPayment.refundedAmount.greaterThan(currentPayment.amount)
      ? currentPayment.amount
      : currentPayment.refundedAmount;
    const remainingAmount = currentPayment.amount.minus(currentRefundedAmount);
    const adjustmentAmount = refundMoney.amount.greaterThan(remainingAmount)
      ? remainingAmount
      : refundMoney.amount;
    const refundedAmount = currentRefundedAmount.plus(adjustmentAmount);
    const refundStatus =
      params.event.event_type === 'PAYMENT.CAPTURE.REVERSED' ? 'REVERSED' : 'REFUNDED';
    const status = getRefundAwarePaymentStatus(currentPayment.amount, refundedAmount, refundStatus);

    if (
      currentPayment.kind === 'TOPUP' &&
      currentPayment.balanceCreditedAt &&
      adjustmentAmount.greaterThan(0)
    ) {
      await transaction.user.update({
        where: { id: currentPayment.userId },
        data: {
          balance: {
            decrement: adjustmentAmount
          }
        }
      });
    }

    await transaction.payment.update({
      where: { id: currentPayment.id },
      data: {
        refundedAmount,
        status,
        lastSyncedAt: new Date()
      }
    });

    await transaction.paymentEvent.update({
      where: { id: params.claim.id },
      data: {
        ...getWebhookEventData(params.event, params.references, params.money),
        paymentId: currentPayment.id,
        isProcessed: true,
        processedAt: new Date()
      }
    });
  });
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
    where: {
      provider_disputeId: {
        provider: 'PAYPAL',
        disputeId: params.disputeId
      }
    },
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
      provider: 'PAYPAL',
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
  const references = extractWebhookReferences(event);
  const money = extractWebhookMoney(event);
  const claim = await claimPayPalWebhookEvent(event, references, money);

  if (!claim) {
    return;
  }

  try {
    const payment = await findPaymentByReferences(references);

    if (payment && isRefundAdjustmentEventType(event.event_type)) {
      await applyRefundAdjustmentFromWebhook({
        event,
        references,
        money,
        payment,
        claim
      });
      return;
    }

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

    await prisma.paymentEvent.update({
      where: { id: claim.id },
      data: {
        ...getWebhookEventData(event, references, money),
        paymentId: payment?.id ?? null,
        isProcessed: true,
        processedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.paymentEvent.updateMany({
      where: {
        id: claim.id,
        isProcessed: false,
        processedAt: claim.claimedAt
      },
      data: {
        processedAt: null
      }
    });

    throw error;
  }
};
