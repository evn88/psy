import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { getClientFinancialSummary } from '@/modules/payments/financial/financial-service.server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/**
 * Возвращает денежный баланс, тариф и доступные пакеты для формы встречи.
 */
async function getHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const summary = await getClientFinancialSummary(id);

  if (!summary) {
    return NextResponse.json({ message: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(summary);
}

export const GET = withApiLogging(getHandler);
