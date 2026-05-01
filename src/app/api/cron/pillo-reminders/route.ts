import { NextResponse } from 'next/server';

import { recoverPilloReminderWindow } from '@/features/pillo/lib/service';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

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
 * Ежедневно восстанавливает rolling window Pillo.
 * Cron не является точным планировщиком: точное время обеспечивают Workflow `sleep`.
 * @param request - cron-запрос Vercel.
 * @returns Сводка восстановленных приёмов и workflow.
 */
async function getHandler(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const summary = await recoverPilloReminderWindow();

  return NextResponse.json({
    success: true,
    summary
  });
}

export const GET = withApiLogging(getHandler);
