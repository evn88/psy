import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { EventType, EventStatus } from '@prisma/client';
import { sendEventNotificationEmail, sendEventCancellationEmail } from '@/shared/lib/email';

const updateEventSchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  meetLink: z.string().url().optional().or(z.literal('')).nullable(),
  userId: z.string().optional().nullable()
});

/**
 * PATCH /api/admin/events/[id]
 * Обновление события админом
 */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    // @ts-ignore
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
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const { start, end, ...restData } = result.data;

    // Convert date strings to Date objects if provided
    const updateData: any = { ...restData };
    if (start) updateData.start = new Date(start);
    if (end) updateData.end = new Date(end);

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, language: true, timezone: true } }
      }
    });

    if (updatedEvent.user && updatedEvent.user.email) {
      if (updatedEvent.status === 'CANCELLED') {
        await sendEventCancellationEmail({
          email: updatedEvent.user.email,
          name: updatedEvent.user.name || 'User',
          title: updatedEvent.title || '',
          eventType: updatedEvent.type,
          start: updatedEvent.start,
          end: updatedEvent.end,
          manageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my/sessions`,
          locale: updatedEvent.user.language || 'ru',
          timezone: updatedEvent.user.timezone || 'UTC'
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
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    // @ts-ignore
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
        user: { select: { id: true, name: true, email: true, language: true, timezone: true } }
      }
    });

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
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
        timezone: event.user.timezone || 'UTC'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
