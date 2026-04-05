import prisma from '@/shared/lib/prisma';
import { getSafeGoogleCalendarSyncUrl } from '@/shared/lib/safe-url';
import { parseICal } from './ical-parser';

export async function fetchGoogleEvents(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.googleCalendarSyncEnabled || !user.googleCalendarSyncUrl) {
      return [];
    }

    const syncUrl = getSafeGoogleCalendarSyncUrl(user.googleCalendarSyncUrl);
    if (!syncUrl) {
      console.error('Blocked unsafe Google Calendar sync URL', { userId });
      return [];
    }

    // Скачиваем iCal формат по указанному Secret URL
    const res = await fetch(syncUrl, { cache: 'no-store' });
    if (!res.ok) return [];

    const text = await res.text();
    return parseICal(text).map(e => ({
      ...e,
      // Делаем заглушки для обязательных полей
      user: null,
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cancelReason: null
    }));
  } catch (error) {
    console.error('Failed to fetch google events', error);
    return [];
  }
}

// Заглушка, если где-то используется старая нерабочая логика POST (можно безопасно убрать, но оставим пустой для совместимости)
export async function syncEventWithGoogle(eventId: string, action: 'CREATE' | 'UPDATE' | 'DELETE') {
  // Google Calendar iCal не принимает POST-запросы.
  // Синхронизация работает только в одну сторону через чтение fetchGoogleEvents.
}
