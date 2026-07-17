import { NextResponse } from 'next/server';

import { EventStatus, EventType, Role, type Prisma } from '@prisma/client';
import { z } from 'zod';

import type { ParsedEvent } from '@/lib/ical-parser';
import { doesDateRangeOverlap, isValidDateRange } from '@/lib/event-utils';
import prisma from '@/lib/prisma';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';
import {
  resolveCalendarApiAccess,
  toAvailableEventDto,
  toBusyEventDto,
  toOwnedEventDto
} from './calendar-user-api';

const getEventsSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

interface DatabaseCalendarEvent {
  id: string;
  type: EventType;
  status: EventStatus;
  start: Date;
  end: Date;
  title: string | null;
  meetLink: string | null;
  userId: string | null;
  reminderMinutesBeforeStart: number;
  bookingReminderMinutesBeforeStart: number | null;
}

/**
 * GET /api/user/events
 * Получение свободных слотов и событий текущего пользователя
 */
async function getHandler(req: Request) {
  try {
    const access = await resolveCalendarApiAccess();
    if (access.status === 'unauthenticated') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (access.status === 'forbidden') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const result = getEventsSchema.safeParse({
      start: startParam || undefined,
      end: endParam || undefined
    });

    if (!result.success) {
      return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
    }

    const { start, end } = result.data;
    if (start && end && !isValidDateRange({ start: new Date(start), end: new Date(end) })) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    const whereClause: Prisma.EventWhereInput = {};

    if (start && end) {
      whereClause.AND = [
        {
          start: {
            lt: new Date(end)
          }
        },
        {
          end: {
            gt: new Date(start)
          }
        }
      ];
    }

    const events = (await prisma.event.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        status: true,
        start: true,
        end: true,
        title: true,
        meetLink: true,
        userId: true,
        reminderMinutesBeforeStart: true,
        bookingReminderMinutesBeforeStart: true
      },
      orderBy: { start: 'asc' }
    })) as DatabaseCalendarEvent[];

    const admin = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
        isDisabled: false,
        googleCalendarSyncEnabled: true
      },
      select: { id: true }
    });

    let googleEvents: ParsedEvent[] = [];
    if (admin) {
      const { fetchGoogleEvents } = await import('@/lib/google-sync');
      googleEvents = await fetchGoogleEvents(
        admin.id,
        start && end ? { start: new Date(start), end: new Date(end) } : undefined
      );
      if (start && end) {
        const startD = new Date(start);
        const endD = new Date(end);
        googleEvents = googleEvents.filter(event =>
          doesDateRangeOverlap({ start: startD, end: endD }, event)
        );
      }
    }

    const now = new Date();
    const visibleDatabaseEvents: Array<
      | ReturnType<typeof toAvailableEventDto>
      | ReturnType<typeof toBusyEventDto>
      | ReturnType<typeof toOwnedEventDto>
    > = [];

    for (const event of events) {
      if (event.userId === access.userId) {
        visibleDatabaseEvents.push(toOwnedEventDto(event));
        continue;
      }

      if (
        event.userId === null &&
        event.type === EventType.FREE_SLOT &&
        event.status === EventStatus.SCHEDULED &&
        event.start > now
      ) {
        visibleDatabaseEvents.push(toAvailableEventDto(event));
        continue;
      }

      if (
        event.status !== EventStatus.CANCELLED &&
        (event.userId !== null || event.type !== EventType.FREE_SLOT)
      ) {
        visibleDatabaseEvents.push(toBusyEventDto(event));
      }
    }
    const visibleGoogleEvents = googleEvents.map(event => toBusyEventDto(event, true));
    const visibleEvents = [...visibleDatabaseEvents, ...visibleGoogleEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return NextResponse.json(visibleEvents);
  } catch (error) {
    console.error('Failed to fetch user events:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiLogging(getHandler);
