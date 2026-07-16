'use server';

import prisma from '@/lib/prisma';
import { encryptData, decryptData, createHmacSignature } from '@/lib/crypto';
import { sendAdminIntakeNotificationToAdmin } from '@/lib/email';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { Prisma } from '@prisma/client';
import { intakeFormStepsSchema, isValidIntakeAnswer } from '@/modules/intake/form-definition';
import { getIntakeFormDefinition } from '@/modules/intake/form-definition.server';
import { defaultLocale, isLocale } from '@/i18n/config';

const hasNewIntakeNotificationsDisabled = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (value as Record<string, unknown>).newIntake === false;
};

/**
 * Отправка ответов анкеты Intake.
 * @param locale - Локаль опубликованной формы.
 * @param answers - Объект с ответами.
 * @returns Объект с результатом операции.
 */
export async function submitIntake(locale: string, answers: Record<string, unknown>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const definition = await getIntakeFormDefinition(isLocale(locale) ? locale : defaultLocale);
    const questions = definition.steps.flatMap(step => step.questions);
    const normalizedAnswers = Object.fromEntries(
      questions.map(question => [question.id, answers[question.id]])
    );

    if (
      !questions.every(question => isValidIntakeAnswer(question, normalizedAnswers[question.id]))
    ) {
      return { success: false, error: 'Некорректные ответы' };
    }

    let profile = await prisma.clientProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.clientProfile.create({
        data: { userId }
      });
    }

    const encryptedAnswers = encryptData(JSON.stringify(normalizedAnswers));

    const intake = await prisma.intakeResponse.create({
      data: {
        clientProfileId: profile.id,
        formId: `intake_v${definition.version}`,
        formVersion: definition.version,
        formSnapshot: definition.steps as unknown as Prisma.InputJsonValue,
        status: 'COMPLETED',
        answers: encryptedAnswers
      }
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, notificationSettings: true }
    });

    for (const admin of admins) {
      if (!hasNewIntakeNotificationsDisabled(admin.notificationSettings)) {
        if (admin.email) {
          await sendAdminIntakeNotificationToAdmin(
            admin.email,
            userId,
            `intake_v${definition.version}`
          );
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
    const parsedAnswers = JSON.parse(decryptedJson) as unknown;
    const answers =
      parsedAnswers && typeof parsedAnswers === 'object' && !Array.isArray(parsedAnswers)
        ? (parsedAnswers as Record<string, unknown>)
        : {};
    const parsedSnapshot = intakeFormStepsSchema.safeParse(intake.formSnapshot);

    return {
      success: true,
      answers,
      formSnapshot: parsedSnapshot.success ? parsedSnapshot.data : null
    };
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
