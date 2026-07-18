import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { EventBillingSource, EventStatus, EventType, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendEventNotificationEmail } from '@/lib/email';
import { fetchGoogleEvents, syncEventWithGoogle } from '@/lib/google-sync';
import { doesDateRangeOverlap, isValidDateRange } from '@/lib/event-utils';
import { optionalMeetingUrlSchema } from '@/lib/safe-url';
import { startSessionReminderWorkflow } from '@/lib/session-reminder-workflow';
import {
  DEFAULT_SESSION_REMINDER_MINUTES,
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES
} from '@/lib/session-reminders';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';
import {
  chargeConsultationInTransaction,
  runFinancialTransaction
} from '@/modules/payments/financial/financial-service.server';
import { FinancialDomainError } from '@/modules/payments/financial/errors';

const getEventsSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

type CalendarEventLike = {
  id: string;
  start: Date;
  end: Date;
  type: EventType;
  status: EventStatus;
  userId: string | null;
};

type EventConflict = {
  id: string;
  start: Date;
  end: Date;
  type: EventType;
  status: EventStatus;
  userId: string | null;
};

/**
 * GET /api/admin/events
 * Получение всех событий для календаря админа с опциональной фильтрацией по датам
 */
async function getHandler(req: Request) {
  try {
    const session = await auth();
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

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, timezone: true } },
        billingAllocation: {
          select: {
            purchasedPackageId: true,
            source: true
          }
        }
      },
      orderBy: { start: 'asc' }
    });

    const googleEvents = (await fetchGoogleEvents(
      session.user.id!,
      start && end ? { start: new Date(start), end: new Date(end) } : undefined
    )) as CalendarEventLike[];
    let filteredGoogle = googleEvents;
    if (start && end) {
      const startD = new Date(start);
      const endD = new Date(end);
      filteredGoogle = googleEvents.filter(event =>
        doesDateRangeOverlap({ start: startD, end: endD }, event)
      );
    }

    const allEvents = [...events, ...filteredGoogle];
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json(allEvents);
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
  meetLink: optionalMeetingUrlSchema,
  userId: z.string().nullable().optional(),
  reminderMinutesBeforeStart: z.coerce
    .number()
    .int()
    .min(MIN_SESSION_REMINDER_MINUTES)
    .max(MAX_SESSION_REMINDER_MINUTES)
    .optional()
    .default(DEFAULT_SESSION_REMINDER_MINUTES),
  billingSource: z.nativeEnum(EventBillingSource).optional(),
  purchasedPackageId: z.string().cuid().optional(),
  billingReason: z.string().trim().max(500).optional()
});

/**
 * POST /api/admin/events
 * Создание нового события админом
 */
async function postHandler(req: Request) {
  try {
    const session = await auth();
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

    const {
      type,
      start,
      end,
      status,
      title,
      meetLink,
      userId,
      reminderMinutesBeforeStart,
      billingSource,
      purchasedPackageId,
      billingReason
    } = result.data;
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (!isValidDateRange({ start: startDate, end: endDate })) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    if (userId) {
      const selectedUser = await prisma.user.findFirst({
        where: {
          id: userId,
          role: { in: ['USER', 'ADMIN'] }
        },
        select: { id: true }
      });

      if (!selectedUser) {
        return NextResponse.json({ message: 'Client not found' }, { status: 400 });
      }
    }

    if (status !== 'CANCELLED') {
      const conflictingEvents = (await prisma.event.findMany({
        where: {
          status: { not: 'CANCELLED' },
          start: { lt: endDate },
          end: { gt: startDate }
        },
        select: {
          id: true,
          start: true,
          end: true,
          type: true,
          status: true,
          userId: true
        }
      })) as EventConflict[];

      const candidateRange = { start: startDate, end: endDate };
      if (
        conflictingEvents.some((conflict: EventConflict) =>
          doesDateRangeOverlap(candidateRange, { start: conflict.start, end: conflict.end })
        )
      ) {
        return NextResponse.json(
          { message: 'Event overlaps with an existing event' },
          { status: 409 }
        );
      }
    }

    const shouldChargeConsultation =
      type === EventType.CONSULTATION && status === EventStatus.SCHEDULED && Boolean(userId);

    if (shouldChargeConsultation && !billingSource) {
      return NextResponse.json(
        { message: 'Выберите источник оплаты консультации' },
        { status: 400 }
      );
    }

    const newEvent = await runFinancialTransaction(async transaction => {
      const createdEvent = await transaction.event.create({
        data: {
          type,
          start: startDate,
          end: endDate,
          status,
          title,
          meetLink: meetLink || null,
          userId: userId || null,
          reminderMinutesBeforeStart,
          authorId: session.user.id!
        },
        include: {
          user: { select: { id: true, name: true, email: true, language: true, timezone: true } },
          billingAllocation: {
            select: {
              purchasedPackageId: true,
              source: true
            }
          }
        }
      });

      if (shouldChargeConsultation && billingSource && userId) {
        await chargeConsultationInTransaction(transaction, {
          eventId: createdEvent.id,
          userId,
          initiatedById: session.user.id!,
          durationMinutes: Math.round((endDate.getTime() - startDate.getTime()) / 60_000),
          eventStart: startDate,
          billing: {
            source: billingSource,
            purchasedPackageId,
            reason: billingReason
          }
        });
      }

      return createdEvent;
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
        timezone: newEvent.user.timezone || 'UTC',
        variant: newEvent.status === 'PENDING_CONFIRMATION' ? 'bookingPending' : 'default'
      });
    }

    await startSessionReminderWorkflow({
      id: newEvent.id,
      userId: newEvent.userId,
      status: newEvent.status,
      reminderWorkflowVersion: newEvent.reminderWorkflowVersion
    });

    const googleSyncResult = await syncEventWithGoogle(newEvent.id, 'CREATE');

    return NextResponse.json(
      { ...newEvent, isGoogleSynced: googleSyncResult.success },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FinancialDomainError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: 409 });
    }

    console.error('Failed to create event:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiLogging(getHandler);
export const POST = withApiLogging(postHandler);
