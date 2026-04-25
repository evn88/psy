import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  sendAdminEventBookingEmail,
  sendAdminEventCancellationEmail,
  sendEventCancellationEmail,
  sendEventNotificationEmail
} from '@/shared/lib/email';
import { syncEventWithGoogle } from '@/shared/lib/google-sync';
import { startSessionReminderWorkflow } from '@/shared/lib/session-reminder-workflow';
import {
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES
} from '@/shared/lib/session-reminders';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const reminderMinutesSchema = z.coerce
  .number()
  .int()
  .min(MIN_SESSION_REMINDER_MINUTES)
  .max(MAX_SESSION_REMINDER_MINUTES)
  .optional();

const updateEventSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('book'),
    reminderMinutesBeforeStart: reminderMinutesSchema
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().optional()
  }),
  z.object({
    action: z.literal('reschedule'),
    reason: z.string().optional(),
    newEventId: z.string(),
    reminderMinutesBeforeStart: reminderMinutesSchema
  })
]);

/**
 * PATCH /api/user/events/[id]
 * User booking or canceling an event
 */
async function patchHandler(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
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

    const { action } = result.data;
    const userId = session.user.id;

    // Fetch the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: { select: { id: true, name: true, email: true, language: true, timezone: true } },
        author: { select: { id: true, name: true, email: true, language: true, timezone: true } } // admin who created it
      }
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    let updatedEvent;

    if (action === 'book') {
      const reminderMinutesBeforeStart = result.data.reminderMinutesBeforeStart;
      if (event.userId || event.status !== 'SCHEDULED') {
        return NextResponse.json({ message: 'Slot is not available' }, { status: 400 });
      }

      if (event.start <= new Date()) {
        return NextResponse.json({ message: 'Cannot book past events' }, { status: 400 });
      }

      updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          userId: userId,
          status: 'PENDING_CONFIRMATION',
          type: 'CONSULTATION',
          cancelReason: null,
          bookingReminderMinutesBeforeStart:
            typeof reminderMinutesBeforeStart === 'number' ? reminderMinutesBeforeStart : null,
          reminderEmailSentAt: null,
          reminderPushSentAt: null,
          reminderWorkflowVersion: {
            increment: 1
          }
        },
        include: {
          user: { select: { id: true, name: true, email: true, language: true, timezone: true } },
          author: { select: { id: true, name: true, email: true, language: true, timezone: true } }
        }
      });

      // Send email to user
      if (updatedEvent.user && updatedEvent.user.email) {
        await sendEventNotificationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: 'CONSULTATION',
          start: updatedEvent.start,
          end: updatedEvent.end,
          meetLink: updatedEvent.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC',
          variant: 'bookingPending'
        });
      }

      // Send email to admin
      if (updatedEvent.author && updatedEvent.author.email) {
        await sendAdminEventBookingEmail({
          adminEmail: updatedEvent.author.email,
          adminName: updatedEvent.author.name || 'Admin',
          userName: updatedEvent.user?.name || 'User',
          userEmail: updatedEvent.user?.email || '',
          title: updatedEvent.title || '',
          eventType: 'CONSULTATION',
          start: updatedEvent.start,
          end: updatedEvent.end,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: updatedEvent.author.language || 'ru',
          timezone: updatedEvent.author.timezone || 'UTC'
        });
      }

      await startSessionReminderWorkflow({
        id: updatedEvent.id,
        userId: updatedEvent.userId,
        status: updatedEvent.status,
        reminderWorkflowVersion: updatedEvent.reminderWorkflowVersion
      });
    } else if (action === 'cancel') {
      const reason = result.data.reason;
      // Logic for canceling an event
      if (event.userId !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      if (event.status === 'CANCELLED') {
        return NextResponse.json({ message: 'Already cancelled' }, { status: 400 });
      }

      updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason ? `User cancellation reason: ${reason}` : null,
          reminderWorkflowVersion: {
            increment: 1
          }
        },
        include: {
          user: { select: { id: true, name: true, email: true, language: true, timezone: true } },
          author: { select: { id: true, name: true, email: true, language: true, timezone: true } }
        }
      });

      // Send appropiate email depending on language and user
      if (updatedEvent.user && updatedEvent.user.email) {
        await sendEventCancellationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          reason,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC'
        });
      }

      // Send email to admin
      if (updatedEvent.author && updatedEvent.author.email) {
        await sendAdminEventCancellationEmail({
          adminEmail: updatedEvent.author.email,
          adminName: updatedEvent.author.name || 'Admin',
          userName: updatedEvent.user?.name || 'User',
          userEmail: updatedEvent.user?.email || '',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          reason,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: updatedEvent.author.language || 'ru',
          timezone: updatedEvent.author.timezone || 'UTC'
        });
      }
    } else if (action === 'reschedule') {
      const { newEventId, reason, reminderMinutesBeforeStart } = result.data;

      if (event.userId !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      const newEvent = await prisma.event.findUnique({ where: { id: newEventId } });
      if (!newEvent || newEvent.userId || newEvent.status !== 'SCHEDULED') {
        return NextResponse.json({ message: 'New slot is not available' }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.event.update({
          where: { id: eventId },
          data: {
            status: 'CANCELLED',
            cancelReason: 'User requested reschedule. Reason: ' + (reason || 'Not specified'),
            reminderWorkflowVersion: {
              increment: 1
            }
          }
        }),
        prisma.event.update({
          where: { id: newEventId },
          data: {
            userId: userId,
            status: 'PENDING_CONFIRMATION',
            type: 'CONSULTATION',
            cancelReason: null,
            bookingReminderMinutesBeforeStart:
              typeof reminderMinutesBeforeStart === 'number'
                ? reminderMinutesBeforeStart
                : event.bookingReminderMinutesBeforeStart,
            reminderEmailSentAt: null,
            reminderPushSentAt: null,
            reminderWorkflowVersion: {
              increment: 1
            }
          }
        })
      ]);

      updatedEvent = await prisma.event.findUnique({
        where: { id: newEventId },
        include: {
          user: { select: { id: true, name: true, email: true, language: true, timezone: true } },
          author: { select: { id: true, name: true, email: true, language: true, timezone: true } }
        }
      });

      // Send cancellation for old event and booking for new event
      if (updatedEvent && updatedEvent.user && updatedEvent.user.email) {
        await sendEventCancellationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: event.title || '',
          eventType: event.type,
          start: event.start,
          end: event.end,
          reason: 'Rescheduled',
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC'
        });
        await sendEventNotificationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: 'CONSULTATION',
          start: updatedEvent.start,
          end: updatedEvent.end,
          meetLink: updatedEvent.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC',
          variant: 'bookingPending'
        });
      }

      if (updatedEvent && updatedEvent.author && updatedEvent.author.email) {
        await sendAdminEventCancellationEmail({
          adminEmail: updatedEvent.author.email,
          adminName: updatedEvent.author.name || 'Admin',
          userName: updatedEvent.user?.name || 'User',
          userEmail: updatedEvent.user?.email || '',
          title: event.title || '',
          eventType: event.type,
          start: event.start,
          end: event.end,
          reason: 'Rescheduled. New slot requested.',
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: updatedEvent.author.language || 'ru',
          timezone: updatedEvent.author.timezone || 'UTC'
        });
        await sendAdminEventBookingEmail({
          adminEmail: updatedEvent.author.email,
          adminName: updatedEvent.author.name || 'Admin',
          userName: updatedEvent.user?.name || 'User',
          userEmail: updatedEvent.user?.email || '',
          title: updatedEvent.title || '',
          eventType: 'CONSULTATION',
          start: updatedEvent.start,
          end: updatedEvent.end,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: updatedEvent.author.language || 'ru',
          timezone: updatedEvent.author.timezone || 'UTC'
        });
      }

      if (updatedEvent) {
        await startSessionReminderWorkflow({
          id: updatedEvent.id,
          userId: updatedEvent.userId,
          status: updatedEvent.status,
          reminderWorkflowVersion: updatedEvent.reminderWorkflowVersion
        });
      }
    }

    // Trigger Google Calendar sync hook
    syncEventWithGoogle(updatedEvent.id, 'UPDATE');

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error(`Failed to execute action on event:`, error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withApiLogging(patchHandler);
