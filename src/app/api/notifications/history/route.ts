import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { getUserNotificationsHistory } from '@/modules/notifications/notification-service.server';

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate'
};

/** Возвращает следующую страницу полной истории уведомлений текущего пользователя. */
async function getHandler(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
  }

  const cursorParam = new URL(request.url).searchParams.get('cursor');
  if (cursorParam && cursorParam.length > 100) {
    return NextResponse.json(
      { message: 'Invalid cursor' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const cursor = cursorParam || undefined;
  const page = await getUserNotificationsHistory(session.user.id, cursor);
  return NextResponse.json(page, { headers: noStoreHeaders });
}

export const GET = getHandler;
