'use server';

import { del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

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

import { encryptData } from '@/shared/lib/crypto';

/**
 * Сохранить заметку психолога (с шифрованием)
 */
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

/**
 * Удалить конкретную анкету (IntakeResponse)
 */
export async function deleteIntakeResponse(responseId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Получаем clientProfileId перед удалением, чтобы найти userId для revalidatePath
    const intake = await prisma.intakeResponse.findUnique({
      where: { id: responseId },
      select: { clientProfile: { select: { userId: true } } }
    });

    await prisma.intakeResponse.delete({ where: { id: responseId } });

    if (intake?.clientProfile?.userId) {
      revalidatePath(`/admin/clients/${intake.clientProfile.userId}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete intake response:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

/**
 * Удалить согласие клиента
 */
export async function deleteClientConsent(consentId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const consent = await prisma.clientConsent.delete({
      where: { id: consentId }
    });

    revalidatePath(`/admin/clients/${consent.userId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete client consent:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

/**
 * Удаляет документ клиента (администратор может удалять любые файлы)
 */
export async function deleteClientDocument(
  id: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return { success: false, error: 'Forbidden' };

    const document = await prisma.clientDocument.findUnique({ where: { id } });
    if (!document) return { success: false, error: 'Not found' };

    await del(document.url, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN });
    await prisma.clientDocument.delete({ where: { id } });

    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete client document:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

/**
 * Переименовывает документ клиента (администратор может переименовывать любые файлы)
 */
export async function renameClientDocument(
  id: string,
  name: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return { success: false, error: 'Forbidden' };

    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Имя файла не может быть пустым' };

    await prisma.clientDocument.update({ where: { id }, data: { name: trimmed } });

    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to rename client document:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
