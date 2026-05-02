'use server';

import { del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * Удаляет документ текущего пользователя по ID.
 */
export async function deleteUserDocument(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const document = await prisma.clientDocument.findUnique({ where: { id } });
    if (!document) return { success: false, error: 'Not found' };
    if (document.userId !== session.user.id) return { success: false, error: 'Forbidden' };

    await del(document.url, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN });
    await prisma.clientDocument.delete({ where: { id } });

    revalidatePath('/my/data');
    return { success: true };
  } catch {
    return { success: false, error: 'Ошибка при удалении файла' };
  }
}

/**
 * Переименовывает документ текущего пользователя.
 */
export async function renameUserDocument(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const document = await prisma.clientDocument.findUnique({ where: { id } });
    if (!document) return { success: false, error: 'Not found' };
    if (document.userId !== session.user.id) return { success: false, error: 'Forbidden' };

    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Имя файла не может быть пустым' };

    await prisma.clientDocument.update({ where: { id }, data: { name: trimmed } });

    revalidatePath('/my/data');
    return { success: true };
  } catch {
    return { success: false, error: 'Ошибка при переименовании файла' };
  }
}
