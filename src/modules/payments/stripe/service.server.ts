import 'server-only';

import { PaymentKind, Prisma, type Payment } from '@prisma/client';
import type Stripe from 'stripe';

import prisma from '@/lib/prisma';
import { STRIPE_PROVIDER_ID, type SyncPaymentParams } from '@/modules/payments/types';

import { getStripeClient } from './client.server';
import { fromStripeMinorUnits, getStripePaymentStatus } from './mappers';

const CAPTURED_PAYMENT_STATUSES = new Set([
  'COMPLETED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'REVERSED'
]);
const PAYMENT_TRANSACTION_RETRY_LIMIT = 3;
const WEBHOOK_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

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

const toPrismaJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
};

const isTransactionWriteConflict = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
};

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

const getExpandedCharge = (paymentIntent: Stripe.PaymentIntent): Stripe.Charge | null => {
  return paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== 'string'
    ? paymentIntent.latest_charge
    : null;
};

const getPaymentKind = (value: string | undefined): PaymentKind | undefined => {
  return Object.values(PaymentKind).find(kind => kind === value);
};

const findPaymentByReferences = async (references: {
  paymentId?: string;
  orderId?: string;
  captureId?: string;
}): Promise<PaymentReference | null> => {
  if (references.paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: references.paymentId },
      select: paymentReferenceSelect
    });

    if (payment) {
      return payment;
    }
  }

  if (references.captureId) {
    const payment = await prisma.payment.findUnique({
      where: {
        provider_captureId: {
          provider: STRIPE_PROVIDER_ID,
          captureId: references.captureId
        }
      },
      select: paymentReferenceSelect
    });

    if (payment) {
      return payment;
    }
  }

  if (references.orderId) {
    return prisma.payment.findUnique({
      where: {
        provider_orderId: {
          provider: STRIPE_PROVIDER_ID,
          orderId: references.orderId
        }
      },
      select: paymentReferenceSelect
    });
  }

  return null;
};

const getRefundAwareStatus = (
  amount: Prisma.Decimal,
  refundedAmount: Prisma.Decimal,
  paymentIntentStatus: Stripe.PaymentIntent.Status
): string => {
  if (refundedAmount.greaterThanOrEqualTo(amount)) {
    return 'REFUNDED';
  }

  if (refundedAmount.greaterThan(0)) {
    return 'PARTIALLY_REFUNDED';
  }

  return getStripePaymentStatus(paymentIntentStatus);
};

/**
 * Сохраняет PaymentIntent Stripe и атомарно корректирует баланс при top-up и возвратах.
 */
export const syncPaymentFromStripe = async (params: {
  paymentIntent: Stripe.PaymentIntent;
  userId?: string;
  paymentId?: string;
  kind?: PaymentKind;
  servicePackageId?: string;
}): Promise<Payment> => {
  const charge = getExpandedCharge(params.paymentIntent);
  const captureId = charge?.id ?? null;
  const existingPayment = await findPaymentByReferences({
    paymentId: params.paymentId ?? params.paymentIntent.metadata.paymentId,
    orderId: params.paymentIntent.id,
    captureId: captureId ?? undefined
  });
  const userId = params.userId ?? existingPayment?.userId ?? params.paymentIntent.metadata.userId;

  if (!userId) {
    throw new Error(
      `Cannot resolve local user for Stripe PaymentIntent ${params.paymentIntent.id}`
    );
  }

  const amount = fromStripeMinorUnits(params.paymentIntent.amount);
  const refundedAmount = charge
    ? fromStripeMinorUnits(Math.min(charge.amount_refunded, params.paymentIntent.amount))
    : (existingPayment?.refundedAmount ?? new Prisma.Decimal(0));
  const providerStatus = getRefundAwareStatus(amount, refundedAmount, params.paymentIntent.status);
  const status =
    existingPayment &&
    CAPTURED_PAYMENT_STATUSES.has(existingPayment.status) &&
    !CAPTURED_PAYMENT_STATUSES.has(providerStatus)
      ? existingPayment.status
      : providerStatus;
  const kind =
    params.kind ??
    existingPayment?.kind ??
    getPaymentKind(params.paymentIntent.metadata.kind) ??
    PaymentKind.CHECKOUT;
  const paymentData = {
    provider: STRIPE_PROVIDER_ID,
    kind,
    servicePackageId:
      params.servicePackageId ??
      existingPayment?.servicePackageId ??
      params.paymentIntent.metadata.servicePackageId ??
      null,
    userId,
    orderId: params.paymentIntent.id,
    captureId: captureId ?? existingPayment?.captureId ?? null,
    amount,
    currency: params.paymentIntent.currency.toUpperCase(),
    status,
    description: params.paymentIntent.description,
    payerEmail: params.paymentIntent.receipt_email ?? charge?.billing_details.email ?? null,
    rawOrder: toPrismaJson(params.paymentIntent),
    rawCapture: charge ? toPrismaJson(charge) : Prisma.JsonNull,
    capturedAt:
      params.paymentIntent.status === 'succeeded'
        ? new Date((charge?.created ?? params.paymentIntent.created) * 1000)
        : null,
    refundedAmount,
    lastSyncedAt: new Date()
  };

  if (existingPayment && kind !== PaymentKind.TOPUP) {
    return prisma.payment.update({ where: { id: existingPayment.id }, data: paymentData });
  }

  if (existingPayment) {
    return runSerializablePaymentTransaction(async transaction => {
      const currentPayment = await transaction.payment.findUniqueOrThrow({
        where: { id: existingPayment.id },
        select: paymentReferenceSelect
      });
      const isCaptured = CAPTURED_PAYMENT_STATUSES.has(status);
      const shouldCredit = currentPayment.balanceCreditedAt === null && isCaptured;
      const initialCredit = shouldCredit ? amount.minus(refundedAmount) : new Prisma.Decimal(0);
      const refundAdjustment = currentPayment.balanceCreditedAt
        ? refundedAmount.minus(currentPayment.refundedAmount)
        : new Prisma.Decimal(0);
      const balanceDelta = initialCredit.minus(refundAdjustment);
      const payment = await transaction.payment.update({
        where: { id: existingPayment.id },
        data: {
          ...paymentData,
          balanceCreditedAt: currentPayment.balanceCreditedAt ?? (isCaptured ? new Date() : null)
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

      return payment;
    });
  }

  const paymentId = params.paymentId ?? params.paymentIntent.metadata.paymentId;
  const createData = {
    ...(paymentId ? { id: paymentId } : {}),
    ...paymentData,
    ...(kind === PaymentKind.TOPUP
      ? {
          balanceCreditedAt: CAPTURED_PAYMENT_STATUSES.has(status) ? new Date() : null
        }
      : {})
  };

  try {
    if (kind !== PaymentKind.TOPUP) {
      return await prisma.payment.create({ data: createData });
    }

    return await runSerializablePaymentTransaction(async transaction => {
      const payment = await transaction.payment.create({ data: createData });
      const creditAmount = CAPTURED_PAYMENT_STATUSES.has(status)
        ? amount.minus(refundedAmount)
        : new Prisma.Decimal(0);

      if (creditAmount.greaterThan(0)) {
        await transaction.user.update({
          where: { id: userId },
          data: { balance: { increment: creditAmount } }
        });
      }

      return payment;
    });
  } catch (error: unknown) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    return syncPaymentFromStripe(params);
  }
};

/**
 * Загружает актуальный PaymentIntent Stripe и синхронизирует локальный платёж.
 */
export const syncPaymentWithStripe = async (payment: SyncPaymentParams): Promise<Payment> => {
  const paymentIntent = await getStripeClient().paymentIntents.retrieve(payment.orderId, {
    expand: ['latest_charge']
  });

  return syncPaymentFromStripe({
    paymentIntent,
    paymentId: payment.id,
    userId: payment.userId,
    kind: payment.kind,
    servicePackageId: payment.servicePackageId ?? undefined
  });
};

const getPaymentIntentIdFromCharge = (charge: Stripe.Charge): string | null => {
  if (!charge.payment_intent) {
    return null;
  }

  return typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent.id;
};

const getWebhookResource = (event: Stripe.Event): Stripe.Event.Data.Object => {
  return event.data.object;
};

const getWebhookResourceType = (resource: Stripe.Event.Data.Object): string | null => {
  if (typeof resource === 'object' && resource !== null && 'object' in resource) {
    const objectType = (resource as { object?: unknown }).object;
    return typeof objectType === 'string' ? objectType : null;
  }

  return null;
};

/**
 * Идемпотентно обрабатывает подтверждённое событие Stripe.
 */
export const processStripeWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  const resource = getWebhookResource(event);
  const resourceType = getWebhookResourceType(resource);
  const resourceId = 'id' in resource && typeof resource.id === 'string' ? resource.id : null;
  let claimedEvent = await prisma.paymentEvent
    .create({
      data: {
        provider: STRIPE_PROVIDER_ID,
        providerEventId: event.id,
        eventType: event.type,
        resourceType,
        resourceId,
        occurredAt: new Date(event.created * 1000),
        payload: toPrismaJson(event),
        processedAt: new Date()
      },
      select: { id: true }
    })
    .catch(async (error: unknown) => {
      if (isUniqueConstraintError(error)) {
        const existingEvent = await prisma.paymentEvent.findUnique({
          where: {
            provider_providerEventId: {
              provider: STRIPE_PROVIDER_ID,
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

        const now = new Date();
        const claimIsActive =
          existingEvent.processedAt !== null &&
          now.getTime() - existingEvent.processedAt.getTime() < WEBHOOK_CLAIM_TIMEOUT_MS;

        if (claimIsActive) {
          return null;
        }

        const claimed = await prisma.paymentEvent.updateMany({
          where: {
            id: existingEvent.id,
            isProcessed: false,
            processedAt: existingEvent.processedAt
          },
          data: { processedAt: now }
        });

        return claimed.count === 1 ? { id: existingEvent.id } : null;
      }

      throw error;
    });

  if (!claimedEvent) {
    return;
  }

  try {
    let payment: Payment | null = null;

    if (resourceType === 'payment_intent') {
      const paymentIntent = resource as Stripe.PaymentIntent;
      const expandedPaymentIntent = await getStripeClient().paymentIntents.retrieve(
        paymentIntent.id,
        { expand: ['latest_charge'] }
      );
      payment = await syncPaymentFromStripe({ paymentIntent: expandedPaymentIntent });
    } else if (resourceType === 'charge') {
      const paymentIntentId = getPaymentIntentIdFromCharge(resource as Stripe.Charge);

      if (paymentIntentId) {
        const paymentIntent = await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
          expand: ['latest_charge']
        });
        payment = await syncPaymentFromStripe({ paymentIntent });
      }
    } else if (resourceType === 'dispute') {
      const dispute = resource as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
      const paymentReference = await findPaymentByReferences({ captureId: chargeId });

      await prisma.paymentDispute.upsert({
        where: {
          provider_disputeId: {
            provider: STRIPE_PROVIDER_ID,
            disputeId: dispute.id
          }
        },
        create: {
          provider: STRIPE_PROVIDER_ID,
          paymentId: paymentReference?.id,
          disputeId: dispute.id,
          stage: dispute.status,
          status: dispute.status,
          reason: dispute.reason,
          amount: fromStripeMinorUnits(dispute.amount),
          currency: dispute.currency.toUpperCase(),
          payload: toPrismaJson(dispute)
        },
        update: {
          paymentId: paymentReference?.id,
          stage: dispute.status,
          status: dispute.status,
          reason: dispute.reason,
          amount: fromStripeMinorUnits(dispute.amount),
          currency: dispute.currency.toUpperCase(),
          payload: toPrismaJson(dispute)
        }
      });
    }

    await prisma.paymentEvent.update({
      where: { id: claimedEvent.id },
      data: {
        paymentId: payment?.id,
        orderId: payment?.orderId,
        captureId: payment?.captureId,
        status: payment?.status,
        amount: payment?.amount,
        currency: payment?.currency,
        isProcessed: true,
        processedAt: new Date()
      }
    });
  } catch (error: unknown) {
    await prisma.paymentEvent.update({
      where: { id: claimedEvent.id },
      data: { processedAt: null }
    });
    throw error;
  }
};
