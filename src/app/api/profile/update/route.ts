import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: z.string().min(10).max(20).optional().nullable(),
  googleCalendarSyncUrl: z.string().url().optional().nullable().or(z.literal('')),
  googleCalendarSyncEnabled: z.boolean().optional(),
  workHourStart: z.number().min(0).max(23).optional(),
  workHourEnd: z.number().min(0).max(24).optional(),
  blogNotifications: z.boolean().optional()
});

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        workHourStart: true,
        workHourEnd: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const nextWorkHourStart = result.data.workHourStart ?? currentUser.workHourStart;
    const nextWorkHourEnd = result.data.workHourEnd ?? currentUser.workHourEnd;

    if (nextWorkHourStart >= nextWorkHourEnd) {
      return NextResponse.json(
        { message: 'Work hours must have a positive range' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(result.data.name !== undefined && { name: result.data.name }),
        ...(result.data.phone !== undefined && { phone: result.data.phone }),
        ...(result.data.googleCalendarSyncUrl !== undefined && {
          googleCalendarSyncUrl: result.data.googleCalendarSyncUrl || null
        }),
        ...(result.data.googleCalendarSyncEnabled !== undefined && {
          googleCalendarSyncEnabled: result.data.googleCalendarSyncEnabled
        }),
        ...(result.data.workHourStart !== undefined && {
          workHourStart: result.data.workHourStart
        }),
        ...(result.data.workHourEnd !== undefined && { workHourEnd: result.data.workHourEnd }),
        ...(result.data.blogNotifications !== undefined && {
          blogNotifications: result.data.blogNotifications
        })
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
