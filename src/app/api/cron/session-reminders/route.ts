import { NextResponse } from 'next/server';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

import { checkAndNotifyWorkflowBudgetThreshold } from '@/shared/lib/workflow-budget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Проверяет, что cron-запрос авторизован через CRON_SECRET.
 * @param request - входящий HTTP-запрос в cron-обработчик.
 * @returns `true`, если запрос подписан корректным секретом.
 */
const isAuthorizedCronRequest = (request: Request): boolean => {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }
  const authorizationHeader = request.headers.get('authorization');
  return authorizationHeader === `Bearer ${expectedSecret}`;
};

/**
 * GET /api/cron/session-reminders
 * Ежедневно проверяет месячный порог расхода Workflow и отправляет email-алерт ADMIN.
 */
async function getHandler(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workflowBudgetAlertSummary = await checkAndNotifyWorkflowBudgetThreshold();

    return NextResponse.json({
      success: true,
      workflowBudgetAlertSummary
    });
  } catch (error) {
    console.error('Failed to process workflow budget threshold alert:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiLogging(getHandler);
