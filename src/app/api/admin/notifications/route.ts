import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { createNotificationsForUsers } from '@/modules/notifications/notification-service.server';
import { adminNotificationBroadcastSchema } from '@/modules/notifications/schemas';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/** Создаёт in-app уведомление выбранным пользователям или всей базе. */
async function postHandler(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const result = adminNotificationBroadcastSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json(
      { message: result.error.issues[0]?.message || 'Invalid notification' },
      { status: 400 }
    );
  }

  const users = await prisma.user.findMany({
    where: {
      role: { not: 'GUEST' },
      ...(result.data.sendToAll ? {} : { email: { in: result.data.to } })
    },
    select: { id: true }
  });

  if (users.length === 0) {
    return NextResponse.json({ message: 'Получатели не найдены' }, { status: 400 });
  }

  const created = await createNotificationsForUsers(
    users.map((user: { id: string }) => user.id),
    {
      kind: 'INFO',
      source: 'ADMIN_BROADCAST',
      title: result.data.title,
      message: result.data.message,
      actionUrl: result.data.actionUrl || null,
      actionLabel: result.data.actionLabel || null
    }
  );

  return NextResponse.json({ success: true, created, recipients: users.length }, { status: 201 });
}

export const POST = withApiLogging(postHandler);
