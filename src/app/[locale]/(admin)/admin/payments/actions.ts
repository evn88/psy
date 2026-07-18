'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getPaymentService } from '@/modules/payments/factory';
import {
  adjustPurchasedPackage,
  adjustWalletBalance
} from '@/modules/payments/financial/financial-service.server';
import {
  DEFAULT_CONSULTATION_RATE_ID,
  FINANCIAL_CURRENCY
} from '@/modules/payments/financial/constants';

const idempotencyKeySchema = z.string().uuid();
const reasonSchema = z.string().trim().min(3).max(500);
const walletAdjustmentSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^-?\d{1,10}(\.\d{1,2})?$/)
    .refine(value => !new Prisma.Decimal(value).equals(0)),
  idempotencyKey: idempotencyKeySchema,
  reason: reasonSchema,
  userId: z.string().trim().min(1).max(128)
});
const packageAdjustmentSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  minutes: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine(value => value !== 0),
  purchasedPackageId: z.string().trim().min(1).max(128),
  reason: reasonSchema,
  userId: z.string().trim().min(1).max(128)
});
const consultationRateSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/)
    .refine(value => new Prisma.Decimal(value).greaterThan(0))
});
const refundSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  paymentId: z.string().trim().min(1).max(128)
});

export interface AdminFinancialActionResult {
  success: boolean;
  message: string;
}

const requireAdmin = async () => {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return null;
  }

  return {
    id: session.user.id
  };
};

const revalidateFinancialPages = (userId?: string): void => {
  revalidatePath('/[locale]/(admin)/admin/payments', 'page');
  revalidatePath('/[locale]/(admin)/admin/clients', 'page');
  if (userId) {
    revalidatePath(`/[locale]/(admin)/admin/clients/${userId}`, 'page');
  }
};

/**
 * Сохраняет фиксированную EUR-стоимость консультации.
 */
export async function updateConsultationRateAction(
  amount: string
): Promise<AdminFinancialActionResult> {
  const admin = await requireAdmin();
  const payload = consultationRateSchema.safeParse({ amount });

  if (!admin) {
    return { success: false, message: 'Недостаточно прав' };
  }
  if (!payload.success) {
    return { success: false, message: 'Укажите положительную сумму в EUR' };
  }

  await prisma.consultationRate.upsert({
    where: { id: DEFAULT_CONSULTATION_RATE_ID },
    update: {
      amount: new Prisma.Decimal(payload.data.amount),
      currency: FINANCIAL_CURRENCY,
      updatedById: admin.id
    },
    create: {
      id: DEFAULT_CONSULTATION_RATE_ID,
      amount: new Prisma.Decimal(payload.data.amount),
      currency: FINANCIAL_CURRENCY,
      updatedById: admin.id
    }
  });
  revalidateFinancialPages();

  return { success: true, message: 'Стоимость консультации обновлена' };
}

/**
 * Создаёт компенсирующую корректировку денежного баланса клиента.
 */
export async function adjustWalletBalanceAction(input: {
  userId: string;
  amount: string;
  reason: string;
  idempotencyKey: string;
}): Promise<AdminFinancialActionResult> {
  const admin = await requireAdmin();
  const payload = walletAdjustmentSchema.safeParse(input);

  if (!admin) {
    return { success: false, message: 'Недостаточно прав' };
  }
  if (!payload.success) {
    return { success: false, message: 'Проверьте сумму и причину корректировки' };
  }

  try {
    await adjustWalletBalance({
      userId: payload.data.userId,
      initiatedById: admin.id,
      amount: new Prisma.Decimal(payload.data.amount),
      reason: payload.data.reason,
      idempotencyKey: `admin-wallet-adjustment:${payload.data.userId}:${payload.data.idempotencyKey}`
    });
    revalidateFinancialPages(payload.data.userId);

    return { success: true, message: 'Баланс скорректирован' };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Не удалось скорректировать баланс'
    };
  }
}

/**
 * Создаёт компенсирующую корректировку минут купленного пакета.
 */
export async function adjustPurchasedPackageAction(input: {
  userId: string;
  purchasedPackageId: string;
  minutes: number;
  reason: string;
  idempotencyKey: string;
}): Promise<AdminFinancialActionResult> {
  const admin = await requireAdmin();
  const payload = packageAdjustmentSchema.safeParse(input);

  if (!admin) {
    return { success: false, message: 'Недостаточно прав' };
  }
  if (!payload.success) {
    return { success: false, message: 'Проверьте минуты и причину корректировки' };
  }

  try {
    await adjustPurchasedPackage({
      userId: payload.data.userId,
      purchasedPackageId: payload.data.purchasedPackageId,
      initiatedById: admin.id,
      minutes: payload.data.minutes,
      reason: payload.data.reason,
      idempotencyKey: `admin-package-adjustment:${payload.data.purchasedPackageId}:${payload.data.idempotencyKey}`
    });
    revalidateFinancialPages(payload.data.userId);

    return { success: true, message: 'Остаток пакета скорректирован' };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Не удалось скорректировать пакет'
    };
  }
}

/**
 * Возвращает весь ещё не возвращённый остаток внешнего платежа.
 */
export async function refundPaymentAction(
  paymentId: string,
  idempotencyKey: string
): Promise<AdminFinancialActionResult> {
  const admin = await requireAdmin();
  const payload = refundSchema.safeParse({ paymentId, idempotencyKey });

  if (!admin) {
    return { success: false, message: 'Недостаточно прав' };
  }
  if (!payload.success) {
    return { success: false, message: 'Некорректный ID платежа' };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: payload.data.paymentId },
    select: {
      amount: true,
      balanceCreditedAt: true,
      captureId: true,
      currency: true,
      fulfilledAt: true,
      id: true,
      kind: true,
      orderId: true,
      refundedAmount: true,
      servicePackageId: true,
      status: true,
      userId: true,
      provider: true
    }
  });

  if (!payment || !payment.captureId) {
    return { success: false, message: 'Платёж не найден или ещё не подтверждён' };
  }

  const refundableAmount = payment.amount.minus(payment.refundedAmount);
  if (!refundableAmount.greaterThan(0)) {
    return { success: false, message: 'Платёж уже полностью возвращён' };
  }

  try {
    const paymentService = await getPaymentService(payment.provider);
    await paymentService.refundPayment({
      payment,
      amount: refundableAmount.toFixed(2),
      idempotencyKey: `admin-refund:${payment.id}:${payload.data.idempotencyKey}`
    });
    revalidateFinancialPages(payment.userId);

    return { success: true, message: 'Возврат отправлен платёжному провайдеру' };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Не удалось выполнить возврат'
    };
  }
}
