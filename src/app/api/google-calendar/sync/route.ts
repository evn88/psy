import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { syncFutureEventsWithGoogle } from '@/lib/google-sync';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/**
 * Повторно отправляет будущие события расписания в подключённый Google Calendar.
 */
async function postHandler() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncFutureEventsWithGoogle(session.user.id);
  return NextResponse.json({ success: result.failed === 0, ...result });
}

export const POST = withApiLogging(postHandler);
