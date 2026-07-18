import { NextResponse } from 'next/server';

import { processFinancialEmailOutbox } from '@/modules/payments/financial/financial-email-outbox.server';
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
 * Доставляет обязательные финансовые письма из транзакционного outbox.
 */
async function getHandler(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const result = await processFinancialEmailOutbox();
  return NextResponse.json({ success: true, ...result });
}

export const GET = withApiLogging(getHandler);
