import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { syncPaymentWithPayPal } from '@/shared/lib/paypal/service';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const syncPaymentsSchema = z.object({
  paymentIds: z.array(z.string()).max(100).optional(),
  userId: z.string().optional()
});

/**
 * POST /api/admin/payments/sync
 * Запускает сверку локальных платежей с PayPal API.
 */
async function postHandler(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = syncPaymentsSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json(
        {
          message: 'Validation error',
          error: payload.error.flatten()
        },
        { status: 400 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: {
        id: payload.data.paymentIds ? { in: payload.data.paymentIds } : undefined,
        userId: payload.data.userId
      },
      orderBy: { createdAt: 'desc' },
      take: payload.data.paymentIds?.length ?? 100,
      select: {
        id: true,
        userId: true,
        orderId: true,
        captureId: true,
        kind: true
      }
    });
    type SyncPaymentRecord = (typeof payments)[number];

    const syncResults = await Promise.allSettled(
      payments.map((payment: SyncPaymentRecord) => {
        return syncPaymentWithPayPal(payment);
      })
    );

    const successCount = syncResults.filter(
      (result: PromiseSettledResult<unknown>) => result.status === 'fulfilled'
    ).length;
    const failedCount = syncResults.length - successCount;

    return NextResponse.json({
      successCount,
      failedCount
    });
  } catch (error: unknown) {
    console.error('Failed to sync payments with PayPal:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
