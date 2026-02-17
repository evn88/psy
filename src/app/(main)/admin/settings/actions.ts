'use server';

import prisma from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { z } from 'zod';

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

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { error: 'Failed to update settings' };
  }
}
