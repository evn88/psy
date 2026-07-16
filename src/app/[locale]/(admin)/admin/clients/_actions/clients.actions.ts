'use server';

import { del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { EventType, EventStatus } from '@prisma/client';

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

import { decryptData, encryptData } from '@/lib/crypto';
import {
  consentSignatureKeyId,
  createSha256Hash,
  parseConsentSignaturePayload,
  verifyConsentSignature
} from '@/modules/intake/consent-signature';

type ConsentVerificationStatus = 'VALID' | 'INVALID' | 'UNVERIFIABLE';

type ConsentVerificationStatusesResult =
  | { success: true; statuses: Record<string, ConsentVerificationStatus> }
  | { success: false; error: string };

type ConsentWithVerificationEvidence = {
  type: string;
  signature: string;
  signatureKeyId: string | null;
  signaturePayload: unknown;
  userId: string;
  agreedAt: Date;
  ip: string | null;
  userAgent: string | null;
  intakeResponse: {
    answers: string;
    formVersion: number | null;
    formSnapshot: unknown;
  } | null;
};

/** Проверяет неизменность данных, зафиксированных электронной подписью согласия. */
const getConsentVerificationStatus = (
  consent: ConsentWithVerificationEvidence
): ConsentVerificationStatus => {
  const payload = parseConsentSignaturePayload(consent.signaturePayload);
  if (
    !payload.success ||
    !consent.intakeResponse ||
    consent.signatureKeyId !== consentSignatureKeyId
  ) {
    return 'UNVERIFIABLE';
  }

  try {
    const answers = JSON.parse(decryptData(consent.intakeResponse.answers)) as unknown;
    const evidenceIsUnchanged =
      payload.data.consentType === consent.type &&
      payload.data.userId === consent.userId &&
      payload.data.agreedAt === consent.agreedAt.toISOString() &&
      payload.data.ip === (consent.ip || '127.0.0.1') &&
      payload.data.userAgent === (consent.userAgent || 'Unknown User Agent') &&
      payload.data.form.version === consent.intakeResponse.formVersion &&
      payload.data.form.snapshotHash === createSha256Hash(consent.intakeResponse.formSnapshot) &&
      payload.data.answersHash === createSha256Hash(answers);

    return evidenceIsUnchanged && verifyConsentSignature(payload.data, consent.signature)
      ? 'VALID'
      : 'INVALID';
  } catch (error) {
    console.error('Failed to verify client consent signature:', error);
    return 'INVALID';
  }
};

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

/** Возвращает подпись и результат проверки неизменности согласия только администратору. */
export async function getClientConsentSignature(consentId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return { success: false, error: 'Недостаточно прав' };
    }

    const consent = await prisma.clientConsent.findUnique({
      where: { id: consentId },
      select: {
        type: true,
        signature: true,
        signatureKeyId: true,
        signaturePayload: true,
        userId: true,
        agreedAt: true,
        ip: true,
        userAgent: true,
        intakeResponse: {
          select: { answers: true, formVersion: true, formSnapshot: true }
        }
      }
    });

    if (!consent) {
      return { success: false, error: 'Согласие не найдено' };
    }

    return {
      success: true,
      consent,
      verification: { status: getConsentVerificationStatus(consent) }
    };
  } catch (error) {
    console.error('Failed to get client consent signature:', error);
    return { success: false, error: 'Не удалось загрузить подпись' };
  }
}

/** Возвращает статусы проверки подписей согласий только администратору. */
export async function getClientConsentVerificationStatuses(
  consentIds: string[]
): Promise<ConsentVerificationStatusesResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return { success: false, error: 'Недостаточно прав' };
    }

    const ids = [...new Set(consentIds)].filter(Boolean).slice(0, 100);
    const consents = await prisma.clientConsent.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        type: true,
        signature: true,
        signatureKeyId: true,
        signaturePayload: true,
        userId: true,
        agreedAt: true,
        ip: true,
        userAgent: true,
        intakeResponse: {
          select: { answers: true, formVersion: true, formSnapshot: true }
        }
      }
    });

    const statuses: Record<string, ConsentVerificationStatus> = {};
    for (const consent of consents as Array<ConsentWithVerificationEvidence & { id: string }>) {
      statuses[consent.id] = getConsentVerificationStatus(consent);
    }

    return { success: true, statuses };
  } catch (error) {
    console.error('Failed to verify client consent signatures:', error);
    return { success: false, error: 'Не удалось проверить подписи' };
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

    try {
      await del(document.url, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.warn('Failed to delete file from Vercel Blob, it might be already missing:', err);
    }
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

export async function updateClientAvatar(userId: string, imageUrl: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl }
    });

    revalidatePath(`/admin/clients/${userId}`);
    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to update avatar:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function assignClientToGroup(userId: string, groupId: string | null) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.user.update({
      where: { id: userId },
      data: { clientGroupId: groupId }
    });

    revalidatePath(`/admin/clients/${userId}`);
    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to assign group:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function createClientGroup(name: string, color: string | null) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.clientGroup.create({
      data: { name, color }
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to create group:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function addClientEvent(
  userId: string,
  data: { title: string; start: Date; end: Date; type: EventType; status: EventStatus }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');
    const authorId = session.user.id;
    if (!authorId) throw new Error('Unauthorized');

    await prisma.event.create({
      data: {
        userId,
        authorId,
        title: data.title,
        start: data.start,
        end: data.end,
        type: data.type,
        status: data.status
      }
    });

    revalidatePath(`/admin/clients/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to add event:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateClientEvent(
  eventId: string,
  userId: string,
  data: { title: string; start: Date; end: Date; type: EventType; status: EventStatus }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        start: data.start,
        end: data.end,
        type: data.type,
        status: data.status
      }
    });

    revalidatePath(`/admin/clients/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update event:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteClientEvent(eventId: string, userId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.event.delete({
      where: { id: eventId }
    });

    revalidatePath(`/admin/clients/${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete event:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateClientGroup(id: string, name: string, color: string | null) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.clientGroup.update({
      where: { id },
      data: { name, color }
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to update group:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteClientGroup(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.clientGroup.delete({
      where: { id }
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete group:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
