'use server';

import prisma from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { z } from 'zod';
import { locales } from '@/i18n/config';

const settingsSchema = z.object({
  language: z.string(),
  theme: z.string()
});

export type SettingsSchema = z.infer<typeof settingsSchema>;

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

export async function updateNotificationSettings(data: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Double check admin role? It's under /admin so middleware protects, but good practice.
  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== 'ADMIN') {
      return { error: 'Not an admin' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notificationSettings: data
      }
    });

    locales.forEach(locale => {
      revalidatePath(`/${locale}/admin/settings`);
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    return { error: 'Failed to update settings' };
  }
}
