'use server';

import prisma from '@/shared/lib/prisma';
import { encryptData, createHmacSignature } from '@/shared/lib/crypto';
import { sendAdminIntakeNotificationToAdmin } from '@/shared/lib/email';
import { headers } from 'next/headers';
import { auth } from '@/auth';

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
