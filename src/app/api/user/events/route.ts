import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

const getEventsSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

/**
 * GET /api/user/events
 * Получение свободных слотов и событий текущего пользователя
 */
export async function GET(req: Request) {
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

    const whereClause: any = {
      OR: [{ type: 'FREE_SLOT' }, { userId: session.user.id }]
    };

    if (start && end) {
      whereClause.AND = [
        {
          OR: [
            {
              start: {
                gte: new Date(start),
                lt: new Date(end)
              }
            },
            {
              end: {
                gt: new Date(start),
                lte: new Date(end)
              }
            },
            {
              start: { lte: new Date(start) },
              end: { gte: new Date(end) }
            }
          ]
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

    // Для свободных слотов возвращаем только базовую информацию без деталей других пользователей
    const sanitizedEvents = events.map((event: any) => {
      if (event.type === 'FREE_SLOT') {
        if (!event.userId) {
          // Available slot
          return {
            ...event,
            user: null
          };
        } else if (event.userId !== session.user.id) {
          // Booked by someone else
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
      }
      return event;
    });

    return NextResponse.json(sanitizedEvents);
  } catch (error) {
    console.error('Failed to fetch user events:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
