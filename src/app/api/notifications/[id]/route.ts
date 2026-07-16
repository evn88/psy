import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { markUserNotificationAsRead } from '@/modules/notifications/notification-service.server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/** Отмечает одно уведомление текущего пользователя прочитанным. */
async function patchHandler(_request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;
  const wasUpdated = await markUserNotificationAsRead(session.user.id, id);

  if (!wasUpdated) {
    return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export const PATCH = withApiLogging(patchHandler);
