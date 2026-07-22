import { NextResponse } from 'next/server';

import {
  EventStatus,
  EventType,
  SystemLogCategory,
  SystemLogLevel,
  type Prisma
} from '@prisma/client';
import { z } from 'zod';

import {
  sendAdminEventBookingEmail,
  sendAdminEventCancellationEmail,
  sendEventCancellationEmail,
  sendEventNotificationEmail
} from '@/lib/email';
import { syncEventWithGoogle } from '@/lib/google-sync';
import prisma from '@/lib/prisma';
import { startSessionReminderWorkflow } from '@/lib/session-reminder-workflow';
import {
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES
} from '@/lib/session-reminders';
import { writeSystemLogEntry } from '@/modules/system-logs/system-log-service.server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';
import { resolveCalendarApiAccess, toOwnedEventDto } from '../calendar-user-api';

const reminderMinutesSchema = z.coerce
  .number()
  .int()
  .min(MIN_SESSION_REMINDER_MINUTES)
  .max(MAX_SESSION_REMINDER_MINUTES)
  .optional();

const reasonSchema = z.string().trim().max(2_000).optional();

const updateEventSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('book'),
    reminderMinutesBeforeStart: reminderMinutesSchema
  }),
  z.object({
    action: z.literal('cancel'),
    reason: reasonSchema
  }),
  z.object({
    action: z.literal('reschedule'),
    reason: reasonSchema,
    newEventId: z.string().min(1).max(128),
    reminderMinutesBeforeStart: reminderMinutesSchema
  })
]);

const eventRecipientsInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      language: true,
      timezone: true
    }
  },
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      language: true,
      timezone: true
    }
  }
} satisfies Prisma.EventInclude;

type EventWithRecipients = Prisma.EventGetPayload<{
  include: typeof eventRecipientsInclude;
}>;

interface CalendarPostCommitTask {
  operation: string;
  service: string;
  run: () => Promise<unknown>;
}

class CalendarMutationError extends Error {
  constructor(
    readonly statusCode: 403 | 404 | 409,
    message: string
  ) {
    super(message);
    this.name = 'CalendarMutationError';
  }
}

/**
 * Возвращает ошибку, которая не раскрывает чужие данные, но различает отсутствие и запрет доступа.
 */
const getOwnedEventMutationError = (
  existingEvent: { userId: string | null } | null,
  userId: string
): CalendarMutationError => {
  if (!existingEvent) {
    return new CalendarMutationError(404, 'Event not found');
  }

  if (existingEvent.userId !== userId) {
    return new CalendarMutationError(403, 'Forbidden');
  }

  return new CalendarMutationError(409, 'Event is no longer available for this action');
};

const isPrismaUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
};

/**
 * Создаёт задачу отправки email, которая считает пустой id ошибкой доставки.
 */
const createCalendarEmailTask = (
  operation: string,
  run: () => Promise<string | null>
): CalendarPostCommitTask => ({
  operation,
  service: 'resend',
  run: async () => {
    const emailId = await run();

    if (!emailId) {
      throw new Error(`Email operation ${operation} did not return a message id`);
    }
  }
});

/**
 * Формирует независимые задачи уведомлений о новом запросе на бронирование.
 */
const createBookingNotificationTasks = (event: EventWithRecipients): CalendarPostCommitTask[] => {
  const tasks: CalendarPostCommitTask[] = [];

  if (event.user?.email) {
    tasks.push(
      createCalendarEmailTask('calendar-booking-user-email', () =>
        sendEventNotificationEmail({
          email: event.user!.email!,
          name: event.user!.name || 'User',
          title: event.title || '',
          eventType: EventType.CONSULTATION,
          start: event.start,
          end: event.end,
          meetLink: event.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: event.user!.language || 'ru',
          timezone: event.user!.timezone || 'UTC',
          variant: 'bookingPending'
        })
      )
    );
  }

  if (event.author?.email) {
    tasks.push(
      createCalendarEmailTask('calendar-booking-admin-email', () =>
        sendAdminEventBookingEmail({
          adminEmail: event.author!.email!,
          adminName: event.author!.name || 'Admin',
          userName: event.user?.name || 'User',
          userEmail: event.user?.email || '',
          title: event.title || '',
          eventType: EventType.CONSULTATION,
          start: event.start,
          end: event.end,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: event.author!.language || 'ru',
          timezone: event.author!.timezone || 'UTC'
        })
      )
    );
  }

  return tasks;
};

/**
 * Формирует независимые задачи уведомлений об отмене события пользователем.
 */
const createCancellationNotificationTasks = (
  event: EventWithRecipients,
  reason?: string
): CalendarPostCommitTask[] => {
  const tasks: CalendarPostCommitTask[] = [];

  if (event.user?.email) {
    tasks.push(
      createCalendarEmailTask('calendar-cancellation-user-email', () =>
        sendEventCancellationEmail({
          email: event.user!.email!,
          name: event.user!.name || 'User',
          title: event.title || '',
          eventType: event.type,
          start: event.start,
          end: event.end,
          reason,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: event.user!.language || 'ru',
          timezone: event.user!.timezone || 'UTC'
        })
      )
    );
  }

  if (event.author?.email) {
    tasks.push(
      createCalendarEmailTask('calendar-cancellation-admin-email', () =>
        sendAdminEventCancellationEmail({
          adminEmail: event.author!.email!,
          adminName: event.author!.name || 'Admin',
          userName: event.user?.name || 'User',
          userEmail: event.user?.email || '',
          title: event.title || '',
          eventType: event.type,
          start: event.start,
          end: event.end,
          reason,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: event.author!.language || 'ru',
          timezone: event.author!.timezone || 'UTC'
        })
      )
    );
  }

  return tasks;
};

/**
 * Выполняет post-commit эффекты независимо и сохраняет каждую ошибку в системном журнале.
 * Сбой интеграции не меняет уже зафиксированный результат календарной мутации.
 */
const runCalendarPostCommitTasks = async ({
  eventId,
  userId,
  tasks
}: {
  eventId: string;
  userId: string;
  tasks: CalendarPostCommitTask[];
}): Promise<void> => {
  const results = await Promise.allSettled(
    tasks.map(task => Promise.resolve().then(() => task.run()))
  );

  await Promise.allSettled(
    results.map(async (result, index) => {
      if (result.status === 'fulfilled') {
        return;
      }

      const task = tasks[index];
      if (!task) {
        return;
      }

      await writeSystemLogEntry({
        category: SystemLogCategory.API,
        level: SystemLogLevel.ERROR,
        source: 'calendar-post-commit',
        operation: task.operation,
        service: task.service,
        userId,
        error: result.reason,
        errorDetails: { eventId }
      });
    })
  );
};

/**
 * Формирует задачу запуска напоминания после успешной фиксации бронирования.
 */
const createReminderTask = (event: EventWithRecipients): CalendarPostCommitTask => ({
  operation: 'calendar-session-reminder-workflow',
  service: 'workflow',
  run: () =>
    startSessionReminderWorkflow({
      id: event.id,
      userId: event.userId,
      status: event.status,
      reminderWorkflowVersion: event.reminderWorkflowVersion
    })
});

/**
 * Формирует задачу синхронизации события с Google Calendar.
 */
const createGoogleSyncTask = (
  eventId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE'
): CalendarPostCommitTask => ({
  operation: `calendar-google-${action.toLowerCase()}`,
  service: 'google-calendar',
  run: async () => {
    const result = await syncEventWithGoogle(eventId, action);

    if (!result.success && !result.skipped) {
      throw new Error(result.message || 'Google Calendar synchronization failed');
    }
  }
});

/**
 * Атомарно занимает свободный будущий слот.
 */
const bookEvent = async (
  eventId: string,
  userId: string,
  reminderMinutesBeforeStart?: number
): Promise<EventWithRecipients> => {
  const claimed = await prisma.event.updateMany({
    where: {
      id: eventId,
      type: EventType.FREE_SLOT,
      status: EventStatus.SCHEDULED,
      userId: null,
      start: { gt: new Date() }
    },
    data: {
      userId,
      status: EventStatus.PENDING_CONFIRMATION,
      type: EventType.CONSULTATION,
      cancelReason: null,
      bookingReminderMinutesBeforeStart:
        typeof reminderMinutesBeforeStart === 'number' ? reminderMinutesBeforeStart : null,
      reminderEmailSentAt: null,
      reminderPushSentAt: null,
      reminderWorkflowVersion: {
        increment: 1
      }
    }
  });

  if (claimed.count !== 1) {
    throw new CalendarMutationError(409, 'Slot is not available');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventRecipientsInclude
  });

  if (!event) {
    throw new Error('Claimed event was not found');
  }

  await runCalendarPostCommitTasks({
    eventId: event.id,
    userId,
    tasks: [
      ...createBookingNotificationTasks(event),
      createReminderTask(event),
      createGoogleSyncTask(event.id, 'UPDATE')
    ]
  });

  return event;
};

/**
 * Атомарно отменяет только активное собственное событие.
 */
const cancelEvent = async (
  eventId: string,
  userId: string,
  reason?: string
): Promise<EventWithRecipients> => {
  const cancelled = await prisma.event.updateMany({
    where: {
      id: eventId,
      userId,
      type: EventType.CONSULTATION,
      status: {
        in: [EventStatus.SCHEDULED, EventStatus.PENDING_CONFIRMATION]
      },
      end: { gt: new Date() }
    },
    data: {
      status: EventStatus.CANCELLED,
      cancelReason: reason ? `User cancellation reason: ${reason}` : null,
      reminderWorkflowVersion: {
        increment: 1
      }
    }
  });

  if (cancelled.count !== 1) {
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { userId: true }
    });
    throw getOwnedEventMutationError(existingEvent, userId);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventRecipientsInclude
  });

  if (!event) {
    throw new Error('Cancelled event was not found');
  }

  await runCalendarPostCommitTasks({
    eventId: event.id,
    userId,
    tasks: [
      ...createCancellationNotificationTasks(event, reason),
      createGoogleSyncTask(event.id, 'UPDATE')
    ]
  });

  return event;
};

interface RescheduleResult {
  updatedEvent: EventWithRecipients;
}

/**
 * Атомарно занимает новый слот для запроса переноса, сохраняя прежнюю встречу активной
 * до решения администратора.
 */
const rescheduleEvent = async ({
  eventId,
  newEventId,
  userId,
  reminderMinutesBeforeStart
}: {
  eventId: string;
  newEventId: string;
  userId: string;
  reminderMinutesBeforeStart?: number;
}): Promise<RescheduleResult> => {
  let result: RescheduleResult;

  try {
    result = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const previousEvent = await transaction.event.findFirst({
        where: {
          id: eventId,
          userId,
          type: EventType.CONSULTATION,
          status: EventStatus.SCHEDULED,
          end: { gt: new Date() }
        },
        include: eventRecipientsInclude
      });

      if (!previousEvent) {
        const existingEvent = await transaction.event.findUnique({
          where: { id: eventId },
          select: { userId: true }
        });
        throw getOwnedEventMutationError(existingEvent, userId);
      }

      const claimedNewSlot = await transaction.event.updateMany({
        where: {
          id: newEventId,
          type: EventType.FREE_SLOT,
          status: EventStatus.SCHEDULED,
          userId: null,
          start: { gt: new Date() }
        },
        data: {
          userId,
          status: EventStatus.PENDING_CONFIRMATION,
          type: EventType.CONSULTATION,
          rescheduleFromEventId: previousEvent.id,
          cancelReason: null,
          bookingReminderMinutesBeforeStart:
            typeof reminderMinutesBeforeStart === 'number'
              ? reminderMinutesBeforeStart
              : previousEvent.bookingReminderMinutesBeforeStart,
          reminderEmailSentAt: null,
          reminderPushSentAt: null,
          reminderWorkflowVersion: {
            increment: 1
          }
        }
      });

      if (claimedNewSlot.count !== 1) {
        throw new CalendarMutationError(409, 'New slot is not available');
      }

      const updatedEvent = await transaction.event.findUnique({
        where: { id: newEventId },
        include: eventRecipientsInclude
      });

      if (!updatedEvent) {
        throw new Error('Rescheduled event was not found');
      }

      return {
        updatedEvent
      };
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new CalendarMutationError(409, 'Reschedule request already exists');
    }

    throw error;
  }

  await runCalendarPostCommitTasks({
    eventId: result.updatedEvent.id,
    userId,
    tasks: [
      ...createBookingNotificationTasks(result.updatedEvent),
      createReminderTask(result.updatedEvent),
      createGoogleSyncTask(result.updatedEvent.id, 'UPDATE')
    ]
  });

  return result;
};

/**
 * PATCH /api/user/events/[id]
 * Бронирование, отмена или перенос события активным пользователем.
 */
async function patchHandler(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const access = await resolveCalendarApiAccess();
    if (access.status === 'unauthenticated') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (access.status === 'forbidden') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id: eventId } = await props.params;
    if (!eventId) {
      return NextResponse.json({ message: 'Missing event ID' }, { status: 400 });
    }

    const result = updateEventSchema.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json(
        { message: 'Validation error', error: result.error.format() },
        { status: 400 }
      );
    }

    if (result.data.action === 'book') {
      const event = await bookEvent(eventId, access.userId, result.data.reminderMinutesBeforeStart);
      return NextResponse.json(toOwnedEventDto(event));
    }

    if (result.data.action === 'cancel') {
      const event = await cancelEvent(eventId, access.userId, result.data.reason);
      return NextResponse.json(toOwnedEventDto(event));
    }

    const { updatedEvent } = await rescheduleEvent({
      eventId,
      newEventId: result.data.newEventId,
      userId: access.userId,
      reminderMinutesBeforeStart: result.data.reminderMinutesBeforeStart
    });

    return NextResponse.json(toOwnedEventDto(updatedEvent));
  } catch (error) {
    if (error instanceof CalendarMutationError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }

    console.error('Failed to execute action on event:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withApiLogging(patchHandler);
