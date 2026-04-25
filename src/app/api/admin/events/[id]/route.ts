import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { EventStatus, EventType, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/shared/lib/prisma';
import { sendEventCancellationEmail, sendEventNotificationEmail } from '@/shared/lib/email';
import { syncEventWithGoogle } from '@/shared/lib/google-sync';
import { doesDateRangeOverlap, isValidDateRange } from '@/shared/lib/event-utils';
import { optionalMeetingUrlSchema } from '@/shared/lib/safe-url';
import { startSessionReminderWorkflow } from '@/shared/lib/session-reminder-workflow';
import {
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES
} from '@/shared/lib/session-reminders';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const eventUserSelect = {
  id: true,
  name: true,
  email: true,
  language: true,
  timezone: true
} as const;

const updateEventSchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  cancelReason: z.string().trim().max(1000).optional().nullable(),
  title: z.string().optional().nullable(),
  meetLink: optionalMeetingUrlSchema,
  userId: z.string().optional().nullable(),
  reminderMinutesBeforeStart: z.coerce
    .number()
    .int()
    .min(MIN_SESSION_REMINDER_MINUTES)
    .max(MAX_SESSION_REMINDER_MINUTES)
    .optional()
});

type EventConflict = {
  id: string;
  start: Date;
  end: Date;
};

/**
 * Возвращает причину отклонения запроса в стабильном виде для хранения и письма.
 * @param cancelReason - значение, переданное из формы отклонения.
 * @returns Нормализованная причина или `null`, если её нет.
 */
const normalizeCancelReason = (cancelReason?: string | null): string | null => {
  const normalizedReason = cancelReason?.trim();

  if (!normalizedReason) {
    return null;
  }

  return normalizedReason;
};

/**
 * PATCH /api/admin/events/[id]
 * Обновление события админом
 */
async function patchHandler(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json({ message: 'Missing event ID' }, { status: 400 });
    }

    const body = await req.json();
    const result = updateEventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Validation error', error: result.error.format() },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: { select: eventUserSelect }
      }
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const { start, end, status, cancelReason, ...restData } = result.data;
    const nextStart = start ? new Date(start) : event.start;
    const nextEnd = end ? new Date(end) : event.end;
    const nextStatus = status ?? event.status;
    const normalizedCancelReason = normalizeCancelReason(cancelReason);
    const hasUserField = Object.prototype.hasOwnProperty.call(result.data, 'userId');
    const hasCancelReasonField = Object.prototype.hasOwnProperty.call(result.data, 'cancelReason');
    const isStartChanged = Boolean(start) && nextStart.getTime() !== event.start.getTime();
    const isEndChanged = Boolean(end) && nextEnd.getTime() !== event.end.getTime();
    const isStatusChanged = typeof status === 'string' && status !== event.status;
    const isReminderMinutesChanged =
      typeof result.data.reminderMinutesBeforeStart === 'number' &&
      result.data.reminderMinutesBeforeStart !== event.reminderMinutesBeforeStart;
    const isUserChanged = hasUserField && result.data.userId !== event.userId;
    const isRejectingPendingRequest =
      event.status === 'PENDING_CONFIRMATION' &&
      nextStatus === 'CANCELLED' &&
      Boolean(event.userId) &&
      Boolean(event.user);
    const isApprovingPendingRequest =
      event.status === 'PENDING_CONFIRMATION' &&
      nextStatus === 'SCHEDULED' &&
      Boolean(event.userId) &&
      Boolean(event.user);
    const effectiveNextStatus = isRejectingPendingRequest ? 'SCHEDULED' : nextStatus;
    const shouldResetReminderSentAt =
      isStartChanged ||
      isEndChanged ||
      isReminderMinutesChanged ||
      isUserChanged ||
      isRejectingPendingRequest;
    const shouldBumpReminderWorkflowVersion = shouldResetReminderSentAt || isStatusChanged;

    if (!isValidDateRange({ start: nextStart, end: nextEnd })) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    if (effectiveNextStatus !== 'CANCELLED') {
      const conflictingEvents = (await prisma.event.findMany({
        where: {
          id: { not: eventId },
          status: { not: 'CANCELLED' },
          start: { lt: nextEnd },
          end: { gt: nextStart }
        },
        select: {
          id: true,
          start: true,
          end: true
        }
      })) as EventConflict[];

      if (
        conflictingEvents.some((conflict: EventConflict) =>
          doesDateRangeOverlap({ start: nextStart, end: nextEnd }, conflict)
        )
      ) {
        return NextResponse.json(
          { message: 'Event overlaps with an existing event' },
          { status: 409 }
        );
      }
    }

    const updateData: Prisma.EventUncheckedUpdateInput = {
      ...restData,
      status: effectiveNextStatus
    };

    if (start) {
      updateData.start = nextStart;
    }
    if (end) {
      updateData.end = nextEnd;
    }
    if (shouldResetReminderSentAt) {
      updateData.reminderEmailSentAt = null;
      updateData.reminderPushSentAt = null;
    }
    if (shouldBumpReminderWorkflowVersion) {
      updateData.reminderWorkflowVersion = {
        increment: 1
      };
    }
    if (hasUserField || isRejectingPendingRequest) {
      updateData.bookingReminderMinutesBeforeStart = null;
    }
    if (hasCancelReasonField) {
      updateData.cancelReason = normalizedCancelReason;
    }
    if (isRejectingPendingRequest) {
      updateData.type = EventType.FREE_SLOT;
      updateData.status = EventStatus.SCHEDULED;
      updateData.userId = null;
      updateData.cancelReason = normalizedCancelReason;
      updateData.meetLink = null;
    }
    if (isApprovingPendingRequest) {
      updateData.cancelReason = null;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        user: { select: eventUserSelect }
      }
    });

    if (isRejectingPendingRequest && event.user?.email) {
      await sendEventCancellationEmail({
        email: event.user.email,
        name: event.user.name || 'User',
        title: event.title || '',
        eventType: event.type,
        start: event.start,
        end: event.end,
        reason: normalizedCancelReason || undefined,
        manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
        locale: event.user.language || 'ru',
        timezone: event.user.timezone || 'UTC',
        variant: 'bookingRejected'
      });
    } else if (updatedEvent.user && updatedEvent.user.email) {
      if (updatedEvent.status === 'CANCELLED') {
        await sendEventCancellationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          reason: updatedEvent.cancelReason || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC'
        });
      } else if (updatedEvent.status === 'PENDING_CONFIRMATION') {
        await sendEventNotificationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          meetLink: updatedEvent.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC',
          variant: 'bookingPending'
        });
      } else if (isApprovingPendingRequest) {
        await sendEventNotificationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          meetLink: updatedEvent.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC',
          variant: 'bookingConfirmed'
        });
      } else {
        await sendEventNotificationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          meetLink: updatedEvent.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC'
        });
      }
    }

    await startSessionReminderWorkflow({
      id: updatedEvent.id,
      userId: updatedEvent.userId,
      status: updatedEvent.status,
      reminderWorkflowVersion: updatedEvent.reminderWorkflowVersion
    });

    // Trigger Google Calendar sync hook
    syncEventWithGoogle(updatedEvent.id, 'UPDATE');

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/events/[id]
 * Удаление события админом
 */
async function deleteHandler(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json({ message: 'Missing event ID' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: { select: eventUserSelect }
      }
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Trigger Google Calendar sync before deletion
    await syncEventWithGoogle(eventId, 'DELETE');

    await prisma.event.delete({
      where: { id: eventId }
    });

    if (event.user && event.user.email) {
      await sendEventCancellationEmail({
        email: event.user.email,
        name: event.user.name || 'User',
        title: event.title || '',
        eventType: event.type,
        start: event.start,
        end: event.end,
        manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
        locale: event.user.language || 'ru',
        timezone: event.user.timezone || 'UTC',
        variant: event.status === 'PENDING_CONFIRMATION' ? 'bookingRejected' : 'default'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withApiLogging(patchHandler);
export const DELETE = withApiLogging(deleteHandler);
