import 'server-only';

import {
  BillingAllocationStatus,
  EventBillingSource,
  FinancialEmailTemplate,
  FinancialOperationStatus,
  FinancialOperationType,
  PackageTransactionType,
  PaymentKind,
  Prisma,
  PurchasedPackageStatus,
  WalletTransactionType
} from '@prisma/client';

import prisma from '@/lib/prisma';

import {
  CONSULTATION_RATE_DURATION_MINUTES,
  DEFAULT_CONSULTATION_RATE_ID,
  FINANCIAL_CURRENCY
} from './constants';
import { FinancialDomainError } from './errors';

const FINANCIAL_TRANSACTION_RETRY_LIMIT = 3;

type FinancialTransactionClient = Prisma.TransactionClient;
type FinancialSummaryPackage = Prisma.PurchasedPackageGetPayload<{
  select: {
    expiresAt: true;
    id: true;
    remainingMinutes: true;
    titleSnapshot: true;
    totalMinutes: true;
  };
}>;

interface FinancialEmailPayload {
  operationId: string;
  operationType: FinancialOperationType;
  amount?: string;
  balanceAfter?: string;
  currency: typeof FINANCIAL_CURRENCY;
  minutes?: number;
  packageRemainingAfter?: number;
  packageTitle?: string;
  reason?: string;
  eventStart?: string;
}

interface QueueOperationEmailParams {
  operationId: string;
  template: FinancialEmailTemplate;
  recipientEmail: string;
  recipientName?: string | null;
  locale?: string | null;
  payload: FinancialEmailPayload;
}

interface ApplyWalletTransactionParams {
  userId: string;
  operationId: string;
  type: WalletTransactionType;
  amount: Prisma.Decimal;
  allowNegative?: boolean;
}

interface ApplyPackageTransactionParams {
  purchasedPackageId: string;
  operationId: string;
  eventId?: string;
  type: PackageTransactionType;
  minutes: number;
}

interface CreateOperationParams {
  userId: string;
  type: FinancialOperationType;
  idempotencyKey: string;
  paymentId?: string;
  eventId?: string;
  initiatedById?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface EventBillingInput {
  source: EventBillingSource;
  purchasedPackageId?: string;
  reason?: string;
}

const isTransactionWriteConflict = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
};

/**
 * Выполняет финансовую операцию в serializable-транзакции с ограниченным retry.
 */
export const runFinancialTransaction = async <T>(
  operation: (transaction: FinancialTransactionClient) => Promise<T>
): Promise<T> => {
  for (let attempt = 1; attempt <= FINANCIAL_TRANSACTION_RETRY_LIMIT; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error: unknown) {
      if (!isTransactionWriteConflict(error) || attempt === FINANCIAL_TRANSACTION_RETRY_LIMIT) {
        throw error;
      }
    }
  }

  throw new Error('Financial transaction retry limit exceeded');
};

const assertEur = (currency: string): void => {
  if (currency.toUpperCase() !== FINANCIAL_CURRENCY) {
    throw new FinancialDomainError(
      'INVALID_CURRENCY',
      `Финансовые операции поддерживают только ${FINANCIAL_CURRENCY}`
    );
  }
};

const getLocalizedTitle = (title: Prisma.JsonValue): string => {
  if (typeof title === 'string') {
    return title;
  }

  if (title && typeof title === 'object' && !Array.isArray(title)) {
    for (const locale of ['ru', 'en', 'sr']) {
      const value = title[locale];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return 'Пакет консультаций';
};

const toInputJson = (value: Prisma.JsonValue): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const createOperation = async (
  transaction: FinancialTransactionClient,
  params: CreateOperationParams
) => {
  return transaction.financialOperation.create({
    data: {
      userId: params.userId,
      type: params.type,
      status: FinancialOperationStatus.PENDING,
      currency: FINANCIAL_CURRENCY,
      paymentId: params.paymentId,
      eventId: params.eventId,
      initiatedById: params.initiatedById,
      idempotencyKey: params.idempotencyKey,
      correlationId: params.idempotencyKey,
      reason: params.reason,
      metadata: params.metadata
    }
  });
};

const completeOperation = async (
  transaction: FinancialTransactionClient,
  operationId: string,
  status: FinancialOperationStatus = FinancialOperationStatus.COMPLETED
) => {
  return transaction.financialOperation.update({
    where: { id: operationId },
    data: {
      status,
      completedAt: new Date()
    }
  });
};

const queueOperationEmail = async (
  transaction: FinancialTransactionClient,
  params: QueueOperationEmailParams
): Promise<void> => {
  await transaction.financialEmailOutbox.create({
    data: {
      operationId: params.operationId,
      dedupeKey: `${params.operationId}:${params.template}:${params.recipientEmail.toLowerCase()}`,
      template: params.template,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName ?? null,
      locale: params.locale || 'ru',
      payload: params.payload as unknown as Prisma.InputJsonValue
    }
  });
};

const queueClientEmail = async (
  transaction: FinancialTransactionClient,
  params: Omit<QueueOperationEmailParams, 'recipientEmail' | 'recipientName' | 'locale'> & {
    userId: string;
  }
): Promise<void> => {
  const user = await transaction.user.findUniqueOrThrow({
    where: { id: params.userId },
    select: {
      email: true,
      language: true,
      name: true
    }
  });

  await queueOperationEmail(transaction, {
    operationId: params.operationId,
    template: params.template,
    recipientEmail: user.email,
    recipientName: user.name,
    locale: user.language,
    payload: params.payload
  });
};

const queueAdminEmails = async (
  transaction: FinancialTransactionClient,
  params: Omit<QueueOperationEmailParams, 'recipientEmail' | 'recipientName' | 'locale'>
): Promise<void> => {
  const admins = await transaction.user.findMany({
    where: {
      role: 'ADMIN',
      isDisabled: false
    },
    select: {
      email: true,
      language: true,
      name: true
    }
  });

  await Promise.all(
    admins.map(admin =>
      queueOperationEmail(transaction, {
        operationId: params.operationId,
        template: params.template,
        recipientEmail: admin.email,
        recipientName: admin.name,
        locale: admin.language,
        payload: params.payload
      })
    )
  );
};

/**
 * Создаёт неизменяемую денежную проводку и синхронно обновляет `User.balance`.
 */
export const applyWalletTransaction = async (
  transaction: FinancialTransactionClient,
  params: ApplyWalletTransactionParams
) => {
  if (params.amount.equals(0)) {
    throw new FinancialDomainError(
      'INVALID_FINANCIAL_AMOUNT',
      'Сумма финансовой проводки не может быть равна нулю'
    );
  }

  const user = await transaction.user.findUniqueOrThrow({
    where: { id: params.userId },
    select: { balance: true }
  });
  const balanceAfter = user.balance.plus(params.amount);

  if (!params.allowNegative && balanceAfter.lessThan(0)) {
    throw new FinancialDomainError('INSUFFICIENT_BALANCE', 'Недостаточно средств на балансе');
  }

  await transaction.user.update({
    where: { id: params.userId },
    data: { balance: balanceAfter }
  });

  return transaction.walletTransaction.create({
    data: {
      userId: params.userId,
      operationId: params.operationId,
      type: params.type,
      amount: params.amount,
      currency: FINANCIAL_CURRENCY,
      balanceBefore: user.balance,
      balanceAfter
    }
  });
};

/**
 * Создаёт неизменяемую проводку пакетных минут и обновляет остаток пакета.
 */
export const applyPackageTransaction = async (
  transaction: FinancialTransactionClient,
  params: ApplyPackageTransactionParams
) => {
  if (!Number.isInteger(params.minutes) || params.minutes === 0) {
    throw new FinancialDomainError(
      'INVALID_PACKAGE_ADJUSTMENT',
      'Корректировка пакета должна содержать целое ненулевое количество минут'
    );
  }

  const purchasedPackage = await transaction.purchasedPackage.findUniqueOrThrow({
    where: { id: params.purchasedPackageId },
    select: {
      remainingMinutes: true,
      status: true,
      totalMinutes: true
    }
  });
  const remainingAfter = purchasedPackage.remainingMinutes + params.minutes;

  if (remainingAfter < 0 || remainingAfter > purchasedPackage.totalMinutes) {
    throw new FinancialDomainError(
      'INSUFFICIENT_PACKAGE_MINUTES',
      'Недостаточно минут в выбранном пакете'
    );
  }

  const nextStatus =
    remainingAfter === 0
      ? PurchasedPackageStatus.EXHAUSTED
      : purchasedPackage.status === PurchasedPackageStatus.EXHAUSTED
        ? PurchasedPackageStatus.ACTIVE
        : purchasedPackage.status;

  await transaction.purchasedPackage.update({
    where: { id: params.purchasedPackageId },
    data: {
      remainingMinutes: remainingAfter,
      status: nextStatus
    }
  });

  return transaction.packageTransaction.create({
    data: {
      purchasedPackageId: params.purchasedPackageId,
      operationId: params.operationId,
      eventId: params.eventId,
      type: params.type,
      minutes: params.minutes,
      remainingBefore: purchasedPackage.remainingMinutes,
      remainingAfter
    }
  });
};

/**
 * Идемпотентно фиксирует успешное внешнее пополнение в EUR-ledger.
 */
export const recordTopupCredit = async (params: {
  transaction: FinancialTransactionClient;
  paymentId: string;
  userId: string;
  amount: Prisma.Decimal;
  provider: string;
}) => {
  const idempotencyKey = `payment-topup:${params.paymentId}`;
  const existingOperation = await params.transaction.financialOperation.findUnique({
    where: { idempotencyKey }
  });

  if (existingOperation) {
    return existingOperation;
  }

  const operation = await createOperation(params.transaction, {
    userId: params.userId,
    type: FinancialOperationType.TOPUP,
    paymentId: params.paymentId,
    idempotencyKey,
    metadata: {
      provider: params.provider
    }
  });
  const walletTransaction = await applyWalletTransaction(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    type: WalletTransactionType.TOPUP,
    amount: params.amount
  });
  const payload: FinancialEmailPayload = {
    operationId: operation.id,
    operationType: operation.type,
    amount: params.amount.toFixed(2),
    balanceAfter: walletTransaction.balanceAfter.toFixed(2),
    currency: FINANCIAL_CURRENCY
  };

  await queueClientEmail(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    template: FinancialEmailTemplate.BALANCE_TOPUP,
    payload
  });
  await queueAdminEmails(params.transaction, {
    operationId: operation.id,
    template: FinancialEmailTemplate.ADMIN_PAYMENT_RECEIVED,
    payload
  });
  await params.transaction.payment.update({
    where: { id: params.paymentId },
    data: {
      fulfilledAt: new Date()
    }
  });

  return completeOperation(params.transaction, operation.id);
};

/**
 * Идемпотентно исполняет прямую покупку пакета после успешного capture.
 */
export const fulfillDirectPackagePurchase = async (params: {
  transaction: FinancialTransactionClient;
  paymentId: string;
  userId: string;
  amount: Prisma.Decimal;
  servicePackageId: string;
  provider: string;
}) => {
  const idempotencyKey = `payment-package-purchase:${params.paymentId}`;
  const existingOperation = await params.transaction.financialOperation.findUnique({
    where: { idempotencyKey },
    include: { purchasedPackage: true }
  });

  if (existingOperation) {
    return existingOperation;
  }

  const servicePackage = await params.transaction.servicePackage.findUniqueOrThrow({
    where: { id: params.servicePackageId },
    select: {
      amount: true,
      currency: true,
      id: true,
      includedMinutes: true,
      title: true
    }
  });

  assertEur(servicePackage.currency);

  if (!servicePackage.amount.equals(params.amount)) {
    throw new FinancialDomainError(
      'INVALID_FINANCIAL_AMOUNT',
      'Сумма платежа не совпадает с актуальной стоимостью пакета'
    );
  }

  const operation = await createOperation(params.transaction, {
    userId: params.userId,
    type: FinancialOperationType.PACKAGE_PURCHASE,
    paymentId: params.paymentId,
    idempotencyKey,
    metadata: {
      provider: params.provider,
      servicePackageId: params.servicePackageId
    }
  });

  await applyWalletTransaction(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    type: WalletTransactionType.TOPUP,
    amount: params.amount
  });
  const debitTransaction = await applyWalletTransaction(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    type: WalletTransactionType.PACKAGE_PURCHASE,
    amount: params.amount.negated()
  });
  const purchasedPackage = await params.transaction.purchasedPackage.create({
    data: {
      userId: params.userId,
      servicePackageId: servicePackage.id,
      purchaseOperationId: operation.id,
      titleSnapshot: toInputJson(servicePackage.title),
      priceSnapshot: servicePackage.amount,
      currencySnapshot: FINANCIAL_CURRENCY,
      totalMinutes: servicePackage.includedMinutes,
      remainingMinutes: 0
    }
  });
  const packageTransaction = await applyPackageTransaction(params.transaction, {
    purchasedPackageId: purchasedPackage.id,
    operationId: operation.id,
    type: PackageTransactionType.PURCHASE_CREDIT,
    minutes: servicePackage.includedMinutes
  });
  const payload: FinancialEmailPayload = {
    operationId: operation.id,
    operationType: operation.type,
    amount: params.amount.toFixed(2),
    balanceAfter: debitTransaction.balanceAfter.toFixed(2),
    currency: FINANCIAL_CURRENCY,
    minutes: servicePackage.includedMinutes,
    packageRemainingAfter: packageTransaction.remainingAfter,
    packageTitle: getLocalizedTitle(servicePackage.title)
  };

  await queueClientEmail(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    template: FinancialEmailTemplate.PACKAGE_PURCHASE,
    payload
  });
  await queueAdminEmails(params.transaction, {
    operationId: operation.id,
    template: FinancialEmailTemplate.ADMIN_PAYMENT_RECEIVED,
    payload
  });
  await params.transaction.payment.update({
    where: { id: params.paymentId },
    data: {
      fulfilledAt: new Date()
    }
  });

  return completeOperation(params.transaction, operation.id);
};

/**
 * Идемпотентно отражает подтверждённый provider refund во внутреннем ledger.
 */
export const recordProviderRefund = async (params: {
  transaction: FinancialTransactionClient;
  paymentId: string;
  userId: string;
  paymentKind: PaymentKind;
  paymentAmount: Prisma.Decimal;
  refundDelta: Prisma.Decimal;
  totalRefundedAmount: Prisma.Decimal;
  provider: string;
}) => {
  if (!params.refundDelta.greaterThan(0)) {
    return null;
  }

  const idempotencyKey = `payment-refund:${params.paymentId}:${params.totalRefundedAmount.toFixed(2)}`;
  const existingOperation = await params.transaction.financialOperation.findUnique({
    where: { idempotencyKey }
  });

  if (existingOperation) {
    return existingOperation;
  }

  const operation = await createOperation(params.transaction, {
    userId: params.userId,
    type: FinancialOperationType.PROVIDER_REFUND,
    paymentId: params.paymentId,
    idempotencyKey,
    metadata: {
      provider: params.provider,
      totalRefundedAmount: params.totalRefundedAmount.toFixed(2)
    }
  });
  let requiresReview = false;
  let packageTransaction: Awaited<ReturnType<typeof applyPackageTransaction>> | null = null;

  if (params.paymentKind === PaymentKind.CHECKOUT) {
    const purchasedPackage = await params.transaction.purchasedPackage.findFirst({
      where: {
        purchaseOperation: {
          paymentId: params.paymentId
        }
      },
      select: {
        id: true,
        remainingMinutes: true,
        status: true,
        titleSnapshot: true,
        totalMinutes: true
      }
    });

    if (purchasedPackage && purchasedPackage.remainingMinutes > 0) {
      packageTransaction = await applyPackageTransaction(params.transaction, {
        purchasedPackageId: purchasedPackage.id,
        operationId: operation.id,
        type: PackageTransactionType.REVOCATION,
        minutes: -purchasedPackage.remainingMinutes
      });
      await params.transaction.purchasedPackage.update({
        where: { id: purchasedPackage.id },
        data: {
          status:
            purchasedPackage.remainingMinutes === purchasedPackage.totalMinutes &&
            params.totalRefundedAmount.greaterThanOrEqualTo(params.paymentAmount)
              ? PurchasedPackageStatus.REVOKED
              : PurchasedPackageStatus.SUSPENDED
        }
      });

      if (
        purchasedPackage.remainingMinutes === purchasedPackage.totalMinutes &&
        params.totalRefundedAmount.greaterThanOrEqualTo(params.paymentAmount)
      ) {
        await applyWalletTransaction(params.transaction, {
          userId: params.userId,
          operationId: operation.id,
          type: WalletTransactionType.PACKAGE_PURCHASE_REVERSAL,
          amount: params.paymentAmount
        });
      } else {
        requiresReview = true;
      }
    } else {
      requiresReview = true;
    }
  }

  const walletTransaction = await applyWalletTransaction(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    type: WalletTransactionType.PROVIDER_REFUND,
    amount: params.refundDelta.negated(),
    allowNegative: true
  });
  const payload: FinancialEmailPayload = {
    operationId: operation.id,
    operationType: operation.type,
    amount: params.refundDelta.negated().toFixed(2),
    balanceAfter: walletTransaction.balanceAfter.toFixed(2),
    currency: FINANCIAL_CURRENCY,
    minutes: packageTransaction?.minutes,
    packageRemainingAfter: packageTransaction?.remainingAfter
  };

  await queueClientEmail(params.transaction, {
    userId: params.userId,
    operationId: operation.id,
    template: FinancialEmailTemplate.PROVIDER_REFUND,
    payload
  });
  await queueAdminEmails(params.transaction, {
    operationId: operation.id,
    template: FinancialEmailTemplate.ADMIN_REFUND,
    payload
  });

  return completeOperation(
    params.transaction,
    operation.id,
    requiresReview ? FinancialOperationStatus.REQUIRES_REVIEW : FinancialOperationStatus.COMPLETED
  );
};

/**
 * Применяет подтверждённый refund, полученный синхронным ответом провайдера.
 */
export const applyConfirmedProviderRefund = async (params: {
  paymentId: string;
  refundAmount: Prisma.Decimal;
  provider: string;
}) => {
  return runFinancialTransaction(async transaction => {
    const payment = await transaction.payment.findUniqueOrThrow({
      where: { id: params.paymentId }
    });
    const remainingRefundable = payment.amount.minus(payment.refundedAmount);
    const refundDelta = Prisma.Decimal.min(params.refundAmount, remainingRefundable);

    if (!refundDelta.greaterThan(0)) {
      return payment;
    }

    const totalRefundedAmount = payment.refundedAmount.plus(refundDelta);
    const status = totalRefundedAmount.greaterThanOrEqualTo(payment.amount)
      ? 'REFUNDED'
      : 'PARTIALLY_REFUNDED';
    const paymentWasFulfilled =
      payment.kind === PaymentKind.TOPUP
        ? Boolean(payment.balanceCreditedAt)
        : Boolean(payment.fulfilledAt);

    if (paymentWasFulfilled) {
      await recordProviderRefund({
        transaction,
        paymentId: payment.id,
        userId: payment.userId,
        paymentKind: payment.kind,
        paymentAmount: payment.amount,
        refundDelta,
        totalRefundedAmount,
        provider: params.provider
      });
    }

    return transaction.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: totalRefundedAmount,
        status,
        lastSyncedAt: new Date()
      }
    });
  });
};

/**
 * Покупает пакет за внутренний EUR-баланс клиента.
 */
export const purchasePackageFromBalance = async (params: {
  userId: string;
  servicePackageId: string;
  idempotencyKey: string;
}) => {
  return runFinancialTransaction(async transaction => {
    const existingOperation = await transaction.financialOperation.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: { purchasedPackage: true }
    });

    if (existingOperation) {
      return existingOperation;
    }

    const servicePackage = await transaction.servicePackage.findFirst({
      where: {
        id: params.servicePackageId,
        isActive: true,
        currency: FINANCIAL_CURRENCY
      },
      select: {
        amount: true,
        id: true,
        includedMinutes: true,
        title: true
      }
    });

    if (!servicePackage) {
      throw new FinancialDomainError('INVALID_PACKAGE', 'Пакет недоступен для покупки');
    }

    const operation = await createOperation(transaction, {
      userId: params.userId,
      type: FinancialOperationType.PACKAGE_PURCHASE,
      idempotencyKey: params.idempotencyKey,
      metadata: {
        purchaseSource: 'BALANCE',
        servicePackageId: servicePackage.id
      }
    });
    const debitTransaction = await applyWalletTransaction(transaction, {
      userId: params.userId,
      operationId: operation.id,
      type: WalletTransactionType.PACKAGE_PURCHASE,
      amount: servicePackage.amount.negated()
    });
    const purchasedPackage = await transaction.purchasedPackage.create({
      data: {
        userId: params.userId,
        servicePackageId: servicePackage.id,
        purchaseOperationId: operation.id,
        titleSnapshot: toInputJson(servicePackage.title),
        priceSnapshot: servicePackage.amount,
        currencySnapshot: FINANCIAL_CURRENCY,
        totalMinutes: servicePackage.includedMinutes,
        remainingMinutes: 0
      }
    });
    const packageTransaction = await applyPackageTransaction(transaction, {
      purchasedPackageId: purchasedPackage.id,
      operationId: operation.id,
      type: PackageTransactionType.PURCHASE_CREDIT,
      minutes: servicePackage.includedMinutes
    });
    const payload: FinancialEmailPayload = {
      operationId: operation.id,
      operationType: operation.type,
      amount: servicePackage.amount.toFixed(2),
      balanceAfter: debitTransaction.balanceAfter.toFixed(2),
      currency: FINANCIAL_CURRENCY,
      minutes: servicePackage.includedMinutes,
      packageRemainingAfter: packageTransaction.remainingAfter,
      packageTitle: getLocalizedTitle(servicePackage.title)
    };

    await queueClientEmail(transaction, {
      userId: params.userId,
      operationId: operation.id,
      template: FinancialEmailTemplate.PACKAGE_PURCHASE,
      payload
    });
    await queueAdminEmails(transaction, {
      operationId: operation.id,
      template: FinancialEmailTemplate.ADMIN_PAYMENT_RECEIVED,
      payload
    });

    return completeOperation(transaction, operation.id);
  });
};

/**
 * Возвращает фиксированную цену консультации или сообщает, что она не настроена.
 */
export const getConsultationRate = async (
  transaction: FinancialTransactionClient | typeof prisma = prisma
) => {
  const rate = await transaction.consultationRate.findUnique({
    where: { id: DEFAULT_CONSULTATION_RATE_ID }
  });

  if (!rate || !rate.amount.greaterThan(0)) {
    throw new FinancialDomainError(
      'CONSULTATION_RATE_NOT_CONFIGURED',
      'Стоимость консультации ещё не настроена'
    );
  }

  assertEur(rate.currency);
  return rate;
};

/**
 * Рассчитывает стоимость консультации пропорционально её длительности.
 * Настроенный тариф всегда задаётся за 60 минут, а результат округляется до центов.
 */
const calculateConsultationChargeAmount = (
  hourlyRate: Prisma.Decimal,
  durationMinutes: number
): Prisma.Decimal => {
  return hourlyRate
    .times(durationMinutes)
    .dividedBy(CONSULTATION_RATE_DURATION_MINUTES)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
};

/**
 * Создаёт финансовое списание и allocation для консультации внутри транзакции события.
 */
export const chargeConsultationInTransaction = async (
  transaction: FinancialTransactionClient,
  params: {
    eventId: string;
    userId: string;
    initiatedById: string;
    durationMinutes: number;
    eventStart: Date;
    billing: EventBillingInput;
    billingRevision?: number;
  }
) => {
  const idempotencyKey = `event-charge:${params.eventId}:${params.billingRevision ?? 1}`;
  const existingOperation = await transaction.financialOperation.findUnique({
    where: { idempotencyKey }
  });

  if (existingOperation) {
    return existingOperation;
  }

  if (!Number.isInteger(params.durationMinutes) || params.durationMinutes <= 0) {
    throw new FinancialDomainError(
      'INVALID_FINANCIAL_AMOUNT',
      'Длительность консультации должна быть положительной'
    );
  }

  const operation = await createOperation(transaction, {
    userId: params.userId,
    type: FinancialOperationType.CONSULTATION_CHARGE,
    eventId: params.eventId,
    initiatedById: params.initiatedById,
    idempotencyKey,
    reason: params.billing.reason,
    metadata: {
      billingSource: params.billing.source,
      durationMinutes: params.durationMinutes
    }
  });

  let chargedAmount: Prisma.Decimal | null = null;
  let packageTransaction: Awaited<ReturnType<typeof applyPackageTransaction>> | null = null;
  let walletTransaction: Awaited<ReturnType<typeof applyWalletTransaction>> | null = null;
  let packageTitle: string | undefined;

  if (params.billing.source === EventBillingSource.WALLET) {
    const rate = await getConsultationRate(transaction);
    chargedAmount = calculateConsultationChargeAmount(rate.amount, params.durationMinutes);
    walletTransaction = await applyWalletTransaction(transaction, {
      userId: params.userId,
      operationId: operation.id,
      type: WalletTransactionType.CONSULTATION_CHARGE,
      amount: chargedAmount.negated()
    });
  } else if (params.billing.source === EventBillingSource.PACKAGE) {
    if (!params.billing.purchasedPackageId) {
      throw new FinancialDomainError('INVALID_PACKAGE', 'Не выбран пакет для списания');
    }

    const purchasedPackage = await transaction.purchasedPackage.findFirst({
      where: {
        id: params.billing.purchasedPackageId,
        userId: params.userId,
        status: PurchasedPackageStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      select: {
        id: true,
        titleSnapshot: true
      }
    });

    if (!purchasedPackage) {
      throw new FinancialDomainError('PACKAGE_NOT_AVAILABLE', 'Выбранный пакет недоступен');
    }

    packageTitle = getLocalizedTitle(purchasedPackage.titleSnapshot);
    packageTransaction = await applyPackageTransaction(transaction, {
      purchasedPackageId: purchasedPackage.id,
      operationId: operation.id,
      eventId: params.eventId,
      type: PackageTransactionType.CONSULTATION_DEBIT,
      minutes: -params.durationMinutes
    });
  } else if (!params.billing.reason?.trim()) {
    throw new FinancialDomainError(
      'INVALID_FINANCIAL_AMOUNT',
      'Для бесплатной консультации требуется причина'
    );
  }

  await transaction.eventBillingAllocation.create({
    data: {
      eventId: params.eventId,
      userId: params.userId,
      chargeOperationId: operation.id,
      source: params.billing.source,
      status: BillingAllocationStatus.RESERVED,
      chargedMinutes: params.durationMinutes,
      chargedAmount,
      currency: params.billing.source === EventBillingSource.WALLET ? FINANCIAL_CURRENCY : null,
      purchasedPackageId: params.billing.purchasedPackageId,
      pricingSnapshot:
        chargedAmount === null
          ? {
              durationMinutes: params.durationMinutes
            }
          : {
              amount: chargedAmount.toFixed(2),
              currency: FINANCIAL_CURRENCY,
              durationMinutes: params.durationMinutes
            }
    }
  });

  await queueClientEmail(transaction, {
    userId: params.userId,
    operationId: operation.id,
    template: FinancialEmailTemplate.CONSULTATION_CHARGE,
    payload: {
      operationId: operation.id,
      operationType: operation.type,
      amount: chargedAmount?.toFixed(2),
      balanceAfter: walletTransaction?.balanceAfter.toFixed(2),
      currency: FINANCIAL_CURRENCY,
      minutes: packageTransaction ? params.durationMinutes : undefined,
      packageRemainingAfter: packageTransaction?.remainingAfter,
      packageTitle,
      reason: params.billing.reason,
      eventStart: params.eventStart.toISOString()
    }
  });

  return completeOperation(transaction, operation.id);
};

/**
 * Возвращает деньги или пакетные минуты при отмене оплаченной консультации.
 */
export const reverseConsultationInTransaction = async (
  transaction: FinancialTransactionClient,
  params: {
    eventId: string;
    initiatedById: string;
    reason?: string;
    billingRevision?: number;
  }
) => {
  const idempotencyKey = `event-reversal:${params.eventId}:${params.billingRevision ?? 1}`;
  const existingOperation = await transaction.financialOperation.findUnique({
    where: { idempotencyKey }
  });

  if (existingOperation) {
    return existingOperation;
  }

  const allocation = await transaction.eventBillingAllocation.findUnique({
    where: { eventId: params.eventId },
    include: {
      event: {
        select: { start: true }
      },
      purchasedPackage: {
        select: {
          id: true,
          titleSnapshot: true
        }
      }
    }
  });

  if (!allocation || allocation.status === BillingAllocationStatus.REVERSED) {
    return null;
  }

  const operation = await createOperation(transaction, {
    userId: allocation.userId,
    type: FinancialOperationType.CONSULTATION_REVERSAL,
    eventId: params.eventId,
    initiatedById: params.initiatedById,
    idempotencyKey,
    reason: params.reason,
    metadata: {
      billingSource: allocation.source
    }
  });
  let walletTransaction: Awaited<ReturnType<typeof applyWalletTransaction>> | null = null;
  let packageTransaction: Awaited<ReturnType<typeof applyPackageTransaction>> | null = null;

  if (allocation.source === EventBillingSource.WALLET && allocation.chargedAmount) {
    walletTransaction = await applyWalletTransaction(transaction, {
      userId: allocation.userId,
      operationId: operation.id,
      type: WalletTransactionType.CONSULTATION_REVERSAL,
      amount: allocation.chargedAmount
    });
  } else if (allocation.source === EventBillingSource.PACKAGE && allocation.purchasedPackageId) {
    packageTransaction = await applyPackageTransaction(transaction, {
      purchasedPackageId: allocation.purchasedPackageId,
      operationId: operation.id,
      eventId: params.eventId,
      type: PackageTransactionType.CONSULTATION_REVERSAL,
      minutes: allocation.chargedMinutes
    });
  }

  await transaction.eventBillingAllocation.update({
    where: { id: allocation.id },
    data: {
      status: BillingAllocationStatus.REVERSED
    }
  });
  await queueClientEmail(transaction, {
    userId: allocation.userId,
    operationId: operation.id,
    template: FinancialEmailTemplate.CONSULTATION_REVERSAL,
    payload: {
      operationId: operation.id,
      operationType: operation.type,
      amount: allocation.chargedAmount?.toFixed(2),
      balanceAfter: walletTransaction?.balanceAfter.toFixed(2),
      currency: FINANCIAL_CURRENCY,
      minutes: packageTransaction ? allocation.chargedMinutes : undefined,
      packageRemainingAfter: packageTransaction?.remainingAfter,
      packageTitle: allocation.purchasedPackage
        ? getLocalizedTitle(allocation.purchasedPackage.titleSnapshot)
        : undefined,
      reason: params.reason,
      eventStart: allocation.event?.start.toISOString()
    }
  });

  return completeOperation(transaction, operation.id);
};

/**
 * Создаёт ручную корректировку денежного баланса администратором.
 */
export const adjustWalletBalance = async (params: {
  userId: string;
  initiatedById: string;
  amount: Prisma.Decimal;
  reason: string;
  idempotencyKey: string;
}) => {
  return runFinancialTransaction(async transaction => {
    const existingOperation = await transaction.financialOperation.findUnique({
      where: { idempotencyKey: params.idempotencyKey }
    });

    if (existingOperation) {
      return existingOperation;
    }

    const operation = await createOperation(transaction, {
      userId: params.userId,
      type: FinancialOperationType.MANUAL_ADJUSTMENT,
      initiatedById: params.initiatedById,
      idempotencyKey: params.idempotencyKey,
      reason: params.reason
    });
    const walletTransaction = await applyWalletTransaction(transaction, {
      userId: params.userId,
      operationId: operation.id,
      type: WalletTransactionType.MANUAL_ADJUSTMENT,
      amount: params.amount,
      allowNegative: true
    });

    await queueClientEmail(transaction, {
      userId: params.userId,
      operationId: operation.id,
      template: FinancialEmailTemplate.MANUAL_ADJUSTMENT,
      payload: {
        operationId: operation.id,
        operationType: operation.type,
        amount: params.amount.toFixed(2),
        balanceAfter: walletTransaction.balanceAfter.toFixed(2),
        currency: FINANCIAL_CURRENCY,
        reason: params.reason
      }
    });

    return completeOperation(transaction, operation.id);
  });
};

/**
 * Создаёт ручную корректировку остатка конкретного купленного пакета.
 */
export const adjustPurchasedPackage = async (params: {
  userId: string;
  purchasedPackageId: string;
  initiatedById: string;
  minutes: number;
  reason: string;
  idempotencyKey: string;
}) => {
  return runFinancialTransaction(async transaction => {
    const existingOperation = await transaction.financialOperation.findUnique({
      where: { idempotencyKey: params.idempotencyKey }
    });

    if (existingOperation) {
      return existingOperation;
    }

    const purchasedPackage = await transaction.purchasedPackage.findFirst({
      where: {
        id: params.purchasedPackageId,
        userId: params.userId
      },
      select: {
        id: true,
        titleSnapshot: true
      }
    });

    if (!purchasedPackage) {
      throw new FinancialDomainError('INVALID_PACKAGE', 'Купленный пакет не найден');
    }

    const operation = await createOperation(transaction, {
      userId: params.userId,
      type: FinancialOperationType.MANUAL_ADJUSTMENT,
      initiatedById: params.initiatedById,
      idempotencyKey: params.idempotencyKey,
      reason: params.reason,
      metadata: {
        purchasedPackageId: params.purchasedPackageId
      }
    });
    const packageTransaction = await applyPackageTransaction(transaction, {
      purchasedPackageId: purchasedPackage.id,
      operationId: operation.id,
      type: PackageTransactionType.MANUAL_ADJUSTMENT,
      minutes: params.minutes
    });

    await queueClientEmail(transaction, {
      userId: params.userId,
      operationId: operation.id,
      template: FinancialEmailTemplate.MANUAL_ADJUSTMENT,
      payload: {
        operationId: operation.id,
        operationType: operation.type,
        currency: FINANCIAL_CURRENCY,
        minutes: params.minutes,
        packageRemainingAfter: packageTransaction.remainingAfter,
        packageTitle: getLocalizedTitle(purchasedPackage.titleSnapshot),
        reason: params.reason
      }
    });

    return completeOperation(transaction, operation.id);
  });
};

/**
 * Возвращает финансовый снимок клиента для админской формы встречи и UI.
 */
export const getClientFinancialSummary = async (userId: string) => {
  const [user, packages, rate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        id: true
      }
    }),
    prisma.purchasedPackage.findMany({
      where: {
        userId,
        status: PurchasedPackageStatus.ACTIVE,
        remainingMinutes: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      select: {
        expiresAt: true,
        id: true,
        remainingMinutes: true,
        titleSnapshot: true,
        totalMinutes: true
      },
      orderBy: [{ expiresAt: 'asc' }, { purchasedAt: 'asc' }]
    }),
    prisma.consultationRate.findUnique({
      where: { id: DEFAULT_CONSULTATION_RATE_ID },
      select: {
        amount: true,
        currency: true
      }
    })
  ]);

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    balance: user.balance.toFixed(2),
    currency: FINANCIAL_CURRENCY,
    consultationPrice: rate?.amount.toFixed(2) ?? '0.00',
    packages: (packages as FinancialSummaryPackage[]).map(purchasedPackage => ({
      id: purchasedPackage.id,
      title: getLocalizedTitle(purchasedPackage.titleSnapshot),
      totalMinutes: purchasedPackage.totalMinutes,
      remainingMinutes: purchasedPackage.remainingMinutes,
      expiresAt: purchasedPackage.expiresAt?.toISOString() ?? null
    }))
  };
};

export const isPackageCheckoutPayment = (kind: PaymentKind, servicePackageId: string | null) => {
  return kind === PaymentKind.CHECKOUT && Boolean(servicePackageId);
};
