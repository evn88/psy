'use server';

import prisma from '@/lib/prisma';
import { encryptData, decryptData, createHmacSignature } from '@/lib/crypto';
import { sendAdminIntakeNotificationToAdmin } from '@/lib/email';
import { headers } from 'next/headers';
import { auth } from '@/auth';

/**
 * Отправка ответов анкеты Intake.
 * @param formId - Идентификатор формы.
 * @param answers - Объект с ответами.
 * @returns Объект с результатом операции.
 */
export async function submitIntake(formId: string, answers: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    let profile = await prisma.clientProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.clientProfile.create({
        data: { userId }
      });
    }

    const encryptedAnswers = encryptData(JSON.stringify(answers));

    const intake = await prisma.intakeResponse.create({
      data: {
        clientProfileId: profile.id,
        formId,
        status: 'COMPLETED',
        answers: encryptedAnswers
      }
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, notificationSettings: true }
    });

    for (const admin of admins) {
      const settings = admin.notificationSettings as any;
      if (!settings || settings.newIntake !== false) {
        if (admin.email) {
          await sendAdminIntakeNotificationToAdmin(admin.email, userId, formId);
        }
      }
    }

    return { success: true, intakeId: intake.id };
  } catch (error) {
    console.error('Failed to submit intake:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

/**
 * Получение и расшифровка ответов конкретной анкеты пользователя.
 * @param intakeId - ID записи анкеты.
 * @returns Объект с расшифрованными данными.
 */
export async function getIntakeAnswers(intakeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const intake = await prisma.intakeResponse.findUnique({
      where: { id: intakeId },
      include: {
        clientProfile: true
      }
    });

    if (!intake) {
      return { success: false, error: 'Not found' };
    }

    // Проверка прав (только владелец или админ)
    const isAdmin = session.user.role === 'ADMIN';
    if (intake.clientProfile.userId !== session.user.id && !isAdmin) {
      return { success: false, error: 'Forbidden' };
    }

    const decryptedJson = decryptData(intake.answers);
    const answers = JSON.parse(decryptedJson);

    return { success: true, answers };
  } catch (error) {
    console.error('Failed to get intake answers:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

/**
 * Фиксация цифрового согласия пользователя.
 * @param type - Тип события согласия.
 * @returns Объект с результатом.
 */
export async function recordConsent(type: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const reqHeaders = await headers();

    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Unknown User Agent';
    const nowStr = new Date().toISOString();

    const payload = JSON.stringify({ userId, ip, userAgent, type, date: nowStr });
    const signature = createHmacSignature(payload);

    await prisma.clientConsent.create({
      data: {
        userId,
        type,
        ip,
        userAgent,
        signature
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to record consent:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
