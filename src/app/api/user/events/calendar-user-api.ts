import 'server-only';

import { createHash } from 'node:crypto';

import { EventStatus, EventType, Role } from '@prisma/client';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

interface CalendarEventDtoSource {
  id: string;
  type: EventType;
  status: EventStatus;
  start: Date;
  end: Date;
  title?: string | null;
  meetLink?: string | null;
  userId?: string | null;
  reminderMinutesBeforeStart?: number;
  bookingReminderMinutesBeforeStart?: number | null;
}

export type CalendarApiAccess =
  | { status: 'authorized'; userId: string }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

/**
 * Проверяет сессию и повторно подтверждает актуальные права пользователя в БД.
 * JWT не считается достаточным источником роли и состояния блокировки.
 */
export const resolveCalendarApiAccess = async (): Promise<CalendarApiAccess> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { status: 'unauthenticated' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isDisabled: true
    }
  });

  if (!user || user.isDisabled || (user.role !== Role.USER && user.role !== Role.ADMIN)) {
    return { status: 'forbidden' };
  }

  return { status: 'authorized', userId: user.id };
};

/**
 * Формирует публичный DTO свободного слота без административных деталей.
 */
export const toAvailableEventDto = (event: CalendarEventDtoSource) => ({
  id: event.id,
  type: EventType.FREE_SLOT,
  status: EventStatus.SCHEDULED,
  start: event.start,
  end: event.end,
  title: null,
  description: null,
  meetLink: null,
  userId: null,
  reminderMinutesBeforeStart: event.reminderMinutesBeforeStart ?? 30,
  bookingReminderMinutesBeforeStart: null
});

/**
 * Формирует DTO собственного события, исключая служебные Google-поля и связи.
 */
export const toOwnedEventDto = (event: CalendarEventDtoSource) => ({
  id: event.id,
  type: event.type,
  status: event.status,
  start: event.start,
  end: event.end,
  title: event.title ?? null,
  description: null,
  meetLink: event.meetLink ?? null,
  userId: 'self',
  reminderMinutesBeforeStart: event.reminderMinutesBeforeStart ?? 30,
  bookingReminderMinutesBeforeStart: event.bookingReminderMinutesBeforeStart ?? null
});

/**
 * Формирует непрозрачный идентификатор для занятого события.
 */
const createBusyEventId = (event: CalendarEventDtoSource): string => {
  const digest = createHash('sha256')
    .update(`${event.id}:${event.start.toISOString()}:${event.end.toISOString()}`)
    .digest('hex')
    .slice(0, 24);

  return `busy-${digest}`;
};

/**
 * Формирует минимальный DTO занятого времени без персональных и служебных данных.
 */
export const toBusyEventDto = (event: CalendarEventDtoSource, isExternal = false) => ({
  id: createBusyEventId(event),
  type: EventType.OTHER,
  status: EventStatus.SCHEDULED,
  start: event.start,
  end: event.end,
  userId: 'hidden',
  isExternal
});
