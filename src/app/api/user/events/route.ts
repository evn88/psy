import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { ParsedEvent } from '@/lib/ical-parser';
import { doesDateRangeOverlap, isValidDateRange } from '@/lib/event-utils';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

const getEventsSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

/**
 * GET /api/user/events
 * Получение свободных слотов и событий текущего пользователя
 */
async function getHandler(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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

    const whereClause: Prisma.EventWhereInput = {
      OR: [{ userId: null }, { type: 'FREE_SLOT' }, { userId: session.user.id }]
    };

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

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { start: 'asc' }
    });

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', googleCalendarSyncEnabled: true }
    });

    let googleEvents: ParsedEvent[] = [];
    if (admin) {
      const { fetchGoogleEvents } = await import('@/lib/google-sync');
      googleEvents = await fetchGoogleEvents(admin.id);
      if (start && end) {
        const startD = new Date(start);
        const endD = new Date(end);
        googleEvents = googleEvents.filter(event =>
          doesDateRangeOverlap({ start: startD, end: endD }, event)
        );
      }
    }

    const allEvents = [...events, ...googleEvents];
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const sanitizedEvents = allEvents
      .map(event => {
        if (!event.userId) {
          return {
            ...event,
            user: null
          };
        }

        if (event.userId !== session.user.id) {
          if (event.type === 'FREE_SLOT') {
            return {
              id: event.id,
              type: event.type,
              start: event.start,
              end: event.end,
              status: event.status,
              title: 'Занято',
              user: null,
              userId: 'hidden'
            };
          }
          return null;
        }

        return event;
      })
      .filter(
        (
          event
        ): event is (typeof events)[number] | (ParsedEvent & { user: null; userId: 'hidden' }) =>
          event !== null
      );

    return NextResponse.json(sanitizedEvents);
  } catch (error) {
    console.error('Failed to fetch user events:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiLogging(getHandler);
