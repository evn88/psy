import { NextResponse } from 'next/server';

import {
  checkPilloCourseEndNotifications,
  recoverPilloReminderWindow
} from '@/modules/pillo/service';
import { startPilloIntakeReminderRunnerWorkflow } from '@/lib/pillo-reminder-workflow';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Проверяет, что cron-запрос подписан `CRON_SECRET`.
 * @param request - входящий запрос.
 * @returns true для разрешённого cron-вызова.
 */
const isAuthorizedCronRequest = (request: Request): boolean => {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${expectedSecret}`;
};

/**
 * Восстанавливает rolling window Pillo и запускает единый runner напоминаний.
 * @param request - cron-запрос Vercel.
 * @returns Сводка восстановленных приёмов, runner workflow и уведомлений о курсах.
 */
async function getHandler(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const [summary, isReminderRunnerStarted, courseEndResult] = await Promise.all([
    recoverPilloReminderWindow(now),
    startPilloIntakeReminderRunnerWorkflow(now),
    checkPilloCourseEndNotifications()
  ]);

  return NextResponse.json({
    success: true,
    summary,
    reminderRunnerStarted: isReminderRunnerStarted,
    courseEnd: courseEndResult
  });
}

export const GET = withApiLogging(getHandler);
