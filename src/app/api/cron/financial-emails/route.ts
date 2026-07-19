import { NextResponse } from 'next/server';

import { startFinancialEmailOutboxWorkflow } from '@/lib/financial-email-workflow';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isAuthorizedCronRequest = (request: Request): boolean => {
  const expectedSecret = process.env.CRON_SECRET;
  return Boolean(
    expectedSecret && request.headers.get('authorization') === `Bearer ${expectedSecret}`
  );
};

/**
 * Ежедневно запускает durable worker доставки финансовых писем из транзакционного outbox.
 */
async function getHandler(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const workerStarted = await startFinancialEmailOutboxWorkflow();

  return NextResponse.json({
    success: true,
    workerStarted
  });
}

export const GET = withApiLogging(getHandler);
