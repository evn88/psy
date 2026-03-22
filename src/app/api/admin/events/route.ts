import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { EventType, EventStatus } from '@prisma/client';
import { sendEventNotificationEmail } from '@/shared/lib/email';
import { syncEventWithGoogle } from '@/shared/lib/google-sync';

const getEventsSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

/**
 * GET /api/admin/events
 * Получение всех событий для календаря админа с опциональной фильтрацией по датам
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore - session.user.role is not strictly typed in default NextAuth session
    if (!session || session.user?.role !== 'ADMIN') {
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

    const whereClause: any = {};
    if (start && end) {
      whereClause.OR = [
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
      ];
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { start: 'asc' }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch admin events:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

const createEventSchema = z.object({
  type: z.nativeEnum(EventType),
  start: z.string().datetime(),
  end: z.string().datetime(),
  status: z.nativeEnum(EventStatus).optional().default('SCHEDULED'),
  title: z.string().optional(),
  meetLink: z.string().url().optional().or(z.literal('')),
  userId: z.string().optional()
});

/**
 * POST /api/admin/events
 * Создание нового события админом
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = createEventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Validation error', error: result.error.format() },
        { status: 400 }
      );
    }

    const { type, start, end, status, title, meetLink, userId } = result.data;

    // TODO: Add overlap validation here if needed

    const newEvent = await prisma.event.create({
      data: {
        type,
        start: new Date(start),
        end: new Date(end),
        status,
        title,
        meetLink: meetLink || null,
        userId: userId || null,
        authorId: session.user.id!
      },
      include: {
        user: { select: { id: true, name: true, email: true, language: true, timezone: true } }
      }
    });

    if (newEvent.user && newEvent.user.email) {
      await sendEventNotificationEmail({
        email: newEvent.user.email,
        name: newEvent.user.name || 'User',
        title: newEvent.title || '',
        eventType: newEvent.type,
        start: newEvent.start,
        end: newEvent.end,
        meetLink: newEvent.meetLink || undefined,
        manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
        locale: newEvent.user.language || 'ru',
        timezone: newEvent.user.timezone || 'UTC'
      });
    }

    // Trigger Google Calendar sync hook
    syncEventWithGoogle(newEvent.id, 'CREATE');

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
