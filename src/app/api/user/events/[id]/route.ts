import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  sendEventNotificationEmail,
  sendEventCancellationEmail,
  sendAdminEventBookingEmail,
  sendAdminEventCancellationEmail
} from '@/shared/lib/email';

const updateEventSchema = z.object({
  action: z.enum(['book', 'cancel']),
  reason: z.string().optional() // for cancellation
});

/**
 * PATCH /api/user/events/[id]
 * User booking or canceling an event
 */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
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

    const { action, reason } = result.data;
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
      // Logic for booking an event
      if (event.type !== 'FREE_SLOT' || event.userId || event.status !== 'SCHEDULED') {
        return NextResponse.json({ message: 'Slot is not available' }, { status: 400 });
      }

      if (event.start <= new Date()) {
        return NextResponse.json({ message: 'Cannot book past events' }, { status: 400 });
      }

      updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          type: 'CONSULTATION', // Change from FREE_SLOT to CONSULTATION upon booking
          userId: userId,
          status: 'SCHEDULED'
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
          title: updatedEvent.title || 'Consultation',
          eventType: 'CONSULTATION',
          start: updatedEvent.start,
          end: updatedEvent.end,
          meetLink: updatedEvent.meetLink || undefined,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC'
        });
      }

      // Send email to admin
      if (updatedEvent.author && updatedEvent.author.email) {
        await sendAdminEventBookingEmail({
          adminEmail: updatedEvent.author.email,
          adminName: updatedEvent.author.name || 'Admin',
          userName: updatedEvent.user?.name || 'User',
          userEmail: updatedEvent.user?.email || '',
          title: updatedEvent.title || 'Consultation',
          eventType: 'CONSULTATION',
          start: updatedEvent.start,
          end: updatedEvent.end,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: updatedEvent.author.language || 'ru'
        });
      }
    } else if (action === 'cancel') {
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
          cancelReason: reason ? `User cancellation reason: ${reason}` : null
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
          title: updatedEvent.title || 'Consultation',
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
          title: updatedEvent.title || 'Consultation',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          reason,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/schedule`,
          locale: updatedEvent.author.language || 'ru'
        });
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error(`Failed to execute action on event:`, error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
