import { NextResponse } from 'next/server';
import { startSystemLogCleanupWorkflow } from '@/shared/lib/system-logs/system-log-cleanup-workflow';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Проверяет, что cron-запрос авторизован через CRON_SECRET.
 * @param request - входящий HTTP-запрос.
 * @returns `true`, если запрос подписан корректным секретом.
 */
const isAuthorizedCronRequest = (request: Request): boolean => {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${expectedSecret}`;
};

/**
 * GET /api/cron/system-logs-cleanup
 * Ежедневно запускает Workflow очистки системного журнала по retention-настройке.
 */
const getHandler = async (request: Request) => {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const workflowRunId = await startSystemLogCleanupWorkflow();

  if (!workflowRunId) {
    return NextResponse.json({ message: 'Failed to start cleanup workflow' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    workflowRunId
  });
};

export const GET = withApiLogging(getHandler);
