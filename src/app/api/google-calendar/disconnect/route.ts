import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/**
 * Отключает Google Calendar и удаляет локально сохранённые OAuth-токены.
 */
async function postHandler() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      googleCalendarSyncEnabled: false,
      googleCalendarAccessToken: null,
      googleCalendarRefreshToken: null,
      googleCalendarTokenExpiresAt: null,
      googleCalendarId: null,
      googleCalendarName: null
    }
  });

  return NextResponse.json({ success: true });
}

export const POST = withApiLogging(postHandler);
