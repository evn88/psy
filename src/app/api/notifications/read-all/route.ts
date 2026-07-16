import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { markAllUserNotificationsAsRead } from '@/modules/notifications/notification-service.server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/** Отмечает все активные уведомления текущего пользователя прочитанными. */
async function postHandler() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const count = await markAllUserNotificationsAsRead(session.user.id);
  return NextResponse.json({ success: true, count });
}

export const POST = withApiLogging(postHandler);
