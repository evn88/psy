'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  getInstalledPaymentConnector,
  testPaymentConnector
} from '@/modules/payments/connectors/registry.server';

export interface PaymentProviderActionState {
  status: 'error' | 'idle' | 'success';
  message: string;
}

const revalidateProviderPages = () => {
  revalidatePath('/admin/payments/providers');
  revalidatePath('/my/payments');
};

const requireAdmin = async (): Promise<boolean> => {
  const session = await auth();
  return session?.user?.role === 'ADMIN';
};

/**
 * Сохраняет универсальные настройки установленного платёжного коннектора.
 */
export async function updatePaymentProviderAction(
  _previousState: PaymentProviderActionState,
  formData: FormData
): Promise<PaymentProviderActionState> {
  if (!(await requireAdmin())) {
    return { status: 'error', message: 'Недостаточно прав' };
  }

  const providerId = String(formData.get('providerId') ?? '');
  const connector = getInstalledPaymentConnector(providerId);

  if (!connector) {
    return { status: 'error', message: 'Коннектор не установлен' };
  }

  const enabled = formData.get('enabled') === 'true';
  const requestedDefault = formData.get('isDefault') === 'true';
  const rawSettings = Object.fromEntries(
    connector.metadata.settingsFields.map(field => [
      field.key,
      String(formData.get(field.key) ?? '')
    ])
  );
  const settings = connector.settingsSchema.safeParse(rawSettings);

  if (!settings.success) {
    return { status: 'error', message: 'Проверьте настройки провайдера' };
  }

  if (enabled) {
    const missingVariables = connector.metadata.requiredEnvironmentVariables.filter(
      name => !process.env[name]?.trim()
    );

    if (missingVariables.length > 0) {
      return {
        status: 'error',
        message: `Сначала задайте переменные окружения: ${missingVariables.join(', ')}`
      };
    }
  }

  try {
    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const current = await transaction.paymentProviderConfig.findUnique({
        where: { id: providerId },
        select: { isDefault: true }
      });
      const existingDefault = await transaction.paymentProviderConfig.findFirst({
        where: { enabled: true, isDefault: true, id: { not: providerId } },
        select: { id: true }
      });
      const shouldBeDefault =
        enabled && (requestedDefault || current?.isDefault === true || !existingDefault);

      if (shouldBeDefault) {
        await transaction.paymentProviderConfig.updateMany({
          where: { isDefault: true, id: { not: providerId } },
          data: { isDefault: false }
        });
      }

      await transaction.paymentProviderConfig.upsert({
        where: { id: providerId },
        create: {
          id: providerId,
          enabled,
          isDefault: shouldBeDefault,
          settings: settings.data as Prisma.InputJsonValue
        },
        update: {
          enabled,
          isDefault: shouldBeDefault,
          settings: settings.data as Prisma.InputJsonValue
        }
      });

      if (!enabled && current?.isDefault) {
        const fallback = await transaction.paymentProviderConfig.findFirst({
          where: { enabled: true, id: { not: providerId } },
          orderBy: { createdAt: 'asc' },
          select: { id: true }
        });

        if (fallback) {
          await transaction.paymentProviderConfig.update({
            where: { id: fallback.id },
            data: { isDefault: true }
          });
        }
      }
    });
  } catch {
    return { status: 'error', message: 'Не удалось сохранить настройки' };
  }

  revalidateProviderPages();
  return { status: 'success', message: 'Настройки провайдера сохранены' };
}

/**
 * Проверяет credentials и доступность API выбранного коннектора.
 */
export async function testPaymentProviderAction(
  _previousState: PaymentProviderActionState,
  formData: FormData
): Promise<PaymentProviderActionState> {
  if (!(await requireAdmin())) {
    return { status: 'error', message: 'Недостаточно прав' };
  }

  const providerId = String(formData.get('providerId') ?? '');

  try {
    const health = await testPaymentConnector(providerId);
    revalidateProviderPages();

    return {
      status: health.status === 'configured' ? 'success' : 'error',
      message: health.message
    };
  } catch {
    return { status: 'error', message: 'Не удалось проверить соединение' };
  }
}
