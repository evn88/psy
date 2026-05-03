'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/auth';
import { locales } from '@/i18n/config';
import prisma from '@/lib/prisma';

const settingsSchema = z.object({
  language: z.string(),
  theme: z.string()
});

export type SettingsSchema = z.infer<typeof settingsSchema>;

/**
 * Сохраняет пользовательские настройки языка и темы.
 * @param data - значения формы настроек.
 * @returns Результат сохранения настроек.
 */
export async function updateSettings(data: SettingsSchema) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const result = settingsSchema.safeParse(data);

  if (!result.success) {
    return { error: 'Invalid data' };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        language: data.language,
        theme: data.theme
      }
    });

    locales.forEach(locale => {
      revalidatePath(`/${locale}/admin/settings`);
      revalidatePath(`/${locale}/my/settings`);
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { error: 'Failed to update settings' };
  }
}
