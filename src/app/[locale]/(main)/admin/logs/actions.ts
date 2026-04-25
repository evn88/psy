'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { locales } from '@/i18n/config';
import prisma from '@/shared/lib/prisma';
import { invalidateSystemLogSettingsCache } from '@/shared/lib/system-logs/system-log-settings.server';

const systemLogSettingsSchema = z.object({
  apiRequestsEnabled: z.boolean(),
  aiErrorsEnabled: z.boolean(),
  paymentErrorsEnabled: z.boolean(),
  retentionDays: z.coerce.number().int().min(1).max(365)
});

export type SystemLogSettingsFormValues = z.infer<typeof systemLogSettingsSchema>;

const clearSystemLogsSchema = z.object({
  mode: z.enum(['all', 'retention'])
});

/**
 * Проверяет, что server action выполняет администратор.
 * @returns `true`, если текущий пользователь является администратором.
 */
const isAdminAction = async (): Promise<boolean> => {
  const session = await auth();
  return session?.user?.role === 'ADMIN';
};

/**
 * Обновляет настройки системного журнала.
 * @param data - Значения формы настроек журнала.
 * @returns Результат сохранения.
 */
export const updateSystemLogSettings = async (data: SystemLogSettingsFormValues) => {
  if (!(await isAdminAction())) {
    return { error: 'Unauthorized' };
  }

  const result = systemLogSettingsSchema.safeParse(data);

  if (!result.success) {
    return { error: 'Invalid data' };
  }

  await prisma.systemLogSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...result.data
    },
    update: result.data
  });

  invalidateSystemLogSettingsCache();

  locales.forEach(locale => {
    revalidatePath(`/${locale}/admin/logs`);
  });

  return { success: true };
};

/**
 * Удаляет записи системного журнала.
 * @param data - Режим очистки журнала.
 * @returns Количество удалённых записей или ошибка.
 */
export const clearSystemLogs = async (data: z.infer<typeof clearSystemLogsSchema>) => {
  if (!(await isAdminAction())) {
    return { error: 'Unauthorized' };
  }

  const result = clearSystemLogsSchema.safeParse(data);

  if (!result.success) {
    return { error: 'Invalid data' };
  }

  const settings = await prisma.systemLogSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      apiRequestsEnabled: true,
      aiErrorsEnabled: true,
      paymentErrorsEnabled: true,
      retentionDays: 30
    }
  });
  const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await prisma.systemLogEntry.deleteMany({
    where: result.data.mode === 'retention' ? { createdAt: { lt: cutoff } } : undefined
  });

  locales.forEach(locale => {
    revalidatePath(`/${locale}/admin/logs`);
  });

  return { success: true, deletedCount: deleted.count };
};
