'use server';

import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

/**
 * Удалить все клиентские данные (но не самого пользователя) или удаляет и пользователя?
 * Пользователь просил "удалить". Думаю, можно удалить самого User (что каскадно удалит и профиль клиента).
 */
export async function deleteClientUser(userId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Удаляем юзера
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

/**
 * Сохранить заметку психолога (С шифрованием)
 */
import { encryptData } from '@/shared/lib/crypto'; // Import needs verification if it works directly
export async function updateClientNotes(userId: string, markdown: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    let profile = await prisma.clientProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.clientProfile.create({
        data: { userId }
      });
    }

    // Шифруем заметки
    const encryptedNotes = encryptData(JSON.stringify({ markdown }));

    await prisma.clientProfile.update({
      where: { id: profile.id },
      data: {
        metadata: {
          encryptedNotes
        }
      }
    });

    revalidatePath(`/admin/clients/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update notes:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
