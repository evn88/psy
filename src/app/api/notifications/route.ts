import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  dismissAllUserNotifications,
  ensureSystemNotifications,
  getUnreadUserNotifications
} from '@/modules/notifications/notification-service.server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate'
};

/** Возвращает активные уведомления текущего пользователя. */
async function getHandler() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
  }

  await ensureSystemNotifications(session.user.id);
  const notifications = await getUnreadUserNotifications(session.user.id);
  return NextResponse.json(notifications, { headers: noStoreHeaders });
}

/** Очищает все активные уведомления текущего пользователя. */
async function deleteHandler() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const count = await dismissAllUserNotifications(session.user.id);
  return NextResponse.json({ success: true, count });
}

// Частый polling-запрос не пишем в системный журнал, чтобы не создавать технический шум в БД.
export const GET = getHandler;
export const DELETE = withApiLogging(deleteHandler);
