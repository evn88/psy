import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  BillingAllocationStatus,
  EventBillingSource,
  EventStatus,
  EventType,
  Prisma
} from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendEventCancellationEmail, sendEventNotificationEmail } from '@/lib/email';
import { syncEventWithGoogle } from '@/lib/google-sync';
import { doesDateRangeOverlap, isValidDateRange } from '@/lib/event-utils';
import { startFinancialEmailOutboxWorkflow } from '@/lib/financial-email-workflow';
import { optionalMeetingUrlSchema } from '@/lib/safe-url';
import { startSessionReminderWorkflow } from '@/lib/session-reminder-workflow';
import {
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES
} from '@/lib/session-reminders';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';
import {
  chargeConsultationInTransaction,
  reverseConsultationInTransaction,
  runFinancialTransaction
} from '@/modules/payments/financial/financial-service.server';
import { FinancialDomainError } from '@/modules/payments/financial/errors';

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
    .optional(),
  billingSource: z.nativeEnum(EventBillingSource).optional(),
  purchasedPackageId: z.string().cuid().optional(),
  billingReason: z.string().trim().max(500).optional()
});

type EventConflict = {
  id: string;
  start: Date;
  end: Date;
};

class EventMutationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventMutationConflictError';
  }
}

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
        user: { select: eventUserSelect },
        billingAllocation: {
          select: {
            id: true,
            purchasedPackageId: true,
            source: true,
            status: true
          }
        },
        rescheduleFrom: {
          select: {
            id: true,
            status: true,
            type: true,
            userId: true,
            billingAllocation: {
              select: {
                status: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const {
      start,
      end,
      status,
      cancelReason,
      billingSource,
      purchasedPackageId,
      billingReason,
      ...restData
    } = result.data;
    const nextStart = start ? new Date(start) : event.start;
    const nextEnd = end ? new Date(end) : event.end;
    const nextStatus = status ?? event.status;
    const nextType = result.data.type ?? event.type;
    const normalizedCancelReason = normalizeCancelReason(cancelReason);
    const hasUserField = Object.prototype.hasOwnProperty.call(result.data, 'userId');
    const hasCancelReasonField = Object.prototype.hasOwnProperty.call(result.data, 'cancelReason');
    const targetUserId = hasUserField ? result.data.userId : event.userId;
    const isStartChanged = Boolean(start) && nextStart.getTime() !== event.start.getTime();
    const isEndChanged = Boolean(end) && nextEnd.getTime() !== event.end.getTime();
    const previousDurationMinutes = Math.round(
      (event.end.getTime() - event.start.getTime()) / 60_000
    );
    const nextDurationMinutes = Math.round((nextEnd.getTime() - nextStart.getTime()) / 60_000);
    const isDurationChanged = nextDurationMinutes !== previousDurationMinutes;
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
    const isApprovingRescheduleRequest =
      isApprovingPendingRequest && Boolean(event.rescheduleFromEventId && event.rescheduleFrom);
    const effectiveNextStatus = isRejectingPendingRequest ? 'SCHEDULED' : nextStatus;
    const shouldResetReminderSentAt =
      isStartChanged ||
      isEndChanged ||
      isReminderMinutesChanged ||
      isUserChanged ||
      isRejectingPendingRequest;
    const shouldBumpReminderWorkflowVersion = shouldResetReminderSentAt || isStatusChanged;
    const shouldReverseBilling =
      Boolean(event.billingAllocation) &&
      (effectiveNextStatus === EventStatus.CANCELLED ||
        nextType !== EventType.CONSULTATION ||
        isUserChanged);
    const shouldChargeConsultation =
      !isRejectingPendingRequest &&
      !event.billingAllocation &&
      nextType === EventType.CONSULTATION &&
      effectiveNextStatus === EventStatus.SCHEDULED &&
      Boolean(targetUserId);
    const shouldReverseRescheduleSourceBilling = Boolean(
      isApprovingRescheduleRequest &&
        event.rescheduleFrom?.billingAllocation &&
        event.rescheduleFrom.billingAllocation.status !== BillingAllocationStatus.REVERSED
    );

    if (event.billingAllocation && !shouldReverseBilling && isDurationChanged) {
      return NextResponse.json(
        {
          message:
            'У оплаченной консультации нельзя менять длительность. Для этого сначала отмените встречу, чтобы выполнить возврат.'
        },
        { status: 409 }
      );
    }

    if (shouldChargeConsultation && !billingSource) {
      return NextResponse.json(
        { message: 'Выберите источник оплаты консультации' },
        { status: 400 }
      );
    }

    if (!isValidDateRange({ start: nextStart, end: nextEnd })) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    if (targetUserId) {
      const selectedUser = await prisma.user.findFirst({
        where: {
          id: targetUserId,
          role: { in: ['USER', 'ADMIN'] }
        },
        select: { id: true }
      });

      if (!selectedUser) {
        return NextResponse.json({ message: 'Client not found' }, { status: 400 });
      }
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
      updateData.rescheduleFromEventId = null;
      updateData.cancelReason = normalizedCancelReason;
      updateData.meetLink = null;
    }
    if (isApprovingPendingRequest) {
      updateData.cancelReason = null;
      updateData.rescheduleFromEventId = null;
    }

    const updatedEvent = await runFinancialTransaction(async transaction => {
      if (shouldReverseBilling) {
        await reverseConsultationInTransaction(transaction, {
          eventId,
          initiatedById: session.user.id!,
          reason: normalizedCancelReason || 'Изменение или отмена консультации'
        });
      }

      if (isApprovingRescheduleRequest && event.rescheduleFrom) {
        if (shouldReverseRescheduleSourceBilling) {
          await reverseConsultationInTransaction(transaction, {
            eventId: event.rescheduleFrom.id,
            initiatedById: session.user.id!,
            reason: 'Перенос консультации на новое время'
          });
        }

        const releasedSourceEvent = await transaction.event.updateMany({
          where: {
            id: event.rescheduleFrom.id,
            userId: targetUserId,
            type: EventType.CONSULTATION,
            status: EventStatus.SCHEDULED
          },
          data: {
            type: EventType.FREE_SLOT,
            status: EventStatus.SCHEDULED,
            userId: null,
            title: null,
            meetLink: null,
            cancelReason: null,
            bookingReminderMinutesBeforeStart: null,
            reminderEmailSentAt: null,
            reminderPushSentAt: null,
            reminderWorkflowVersion: {
              increment: 1
            }
          }
        });

        if (releasedSourceEvent.count !== 1) {
          throw new EventMutationConflictError(
            'Исходная встреча уже изменена. Обновите расписание и повторите действие.'
          );
        }
      }

      const nextEvent = await transaction.event.update({
        where: { id: eventId },
        data: updateData,
        include: {
          user: { select: eventUserSelect },
          billingAllocation: {
            select: {
              purchasedPackageId: true,
              source: true
            }
          }
        }
      });

      if (shouldChargeConsultation && billingSource && targetUserId) {
        await chargeConsultationInTransaction(transaction, {
          eventId,
          userId: targetUserId,
          initiatedById: session.user.id!,
          durationMinutes: Math.round((nextEnd.getTime() - nextStart.getTime()) / 60_000),
          eventStart: nextStart,
          allowNegativeBalance: true,
          billing: {
            source: billingSource,
            purchasedPackageId,
            reason: billingReason
          }
        });
      }

      return nextEvent;
    });

    if (shouldReverseBilling || shouldChargeConsultation || shouldReverseRescheduleSourceBilling) {
      await startFinancialEmailOutboxWorkflow();
    }

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

    if (isApprovingRescheduleRequest && event.rescheduleFrom) {
      await syncEventWithGoogle(event.rescheduleFrom.id, 'UPDATE');
    }

    const googleSyncResult = await syncEventWithGoogle(updatedEvent.id, 'UPDATE');

    return NextResponse.json({ ...updatedEvent, isGoogleSynced: googleSyncResult.success });
  } catch (error) {
    if (error instanceof EventMutationConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (error instanceof FinancialDomainError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: 409 });
    }

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

    const billingAllocation = await prisma.eventBillingAllocation.findUnique({
      where: { eventId },
      select: { status: true }
    });

    if (billingAllocation && billingAllocation.status !== BillingAllocationStatus.REVERSED) {
      return NextResponse.json(
        {
          message:
            'Оплаченную консультацию нельзя удалить. Отмените её, чтобы сохранить финансовую историю и вернуть средства.'
        },
        { status: 409 }
      );
    }

    // Trigger Google Calendar sync before deletion
    const googleSyncResult = await syncEventWithGoogle(eventId, 'DELETE');
    if (!googleSyncResult.success && !googleSyncResult.skipped) {
      return NextResponse.json(
        { message: 'Failed to delete the event from Google Calendar' },
        { status: 502 }
      );
    }

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
