'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/auth';
import { purchasePackageFromBalance } from '@/modules/payments/financial/financial-service.server';

const purchasePackageSchema = z.object({
  idempotencyKey: z.string().uuid(),
  servicePackageId: z.string().trim().min(1).max(128)
});

export interface PurchasePackageActionResult {
  success: boolean;
  message: string;
}

/**
 * Покупает пакет за внутренний баланс текущего клиента.
 */
export async function purchasePackageFromBalanceAction(
  servicePackageId: string,
  idempotencyKey: string
): Promise<PurchasePackageActionResult> {
  const session = await auth();

  if (!session?.user?.id || session.user.role === 'GUEST') {
    return {
      success: false,
      message: 'Необходимо войти в личный кабинет'
    };
  }

  const payload = purchasePackageSchema.safeParse({
    idempotencyKey,
    servicePackageId
  });

  if (!payload.success) {
    return {
      success: false,
      message: 'Некорректные данные покупки'
    };
  }

  try {
    await purchasePackageFromBalance({
      userId: session.user.id,
      servicePackageId: payload.data.servicePackageId,
      idempotencyKey: `balance-package:${session.user.id}:${payload.data.idempotencyKey}`
    });
    revalidatePath('/[locale]/(dashboard)/my/payments', 'page');

    return {
      success: true,
      message: 'Пакет успешно куплен'
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Не удалось купить пакет'
    };
  }
}
