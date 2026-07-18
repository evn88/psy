import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getPaymentService } from '@/modules/payments/factory';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';
import { z } from 'zod';

const CAPTURABLE_PAYMENT_STATUSES = new Set(['CREATED', 'SAVED', 'APPROVED']);
const captureRequestSchema = z.object({
  provider: z.string().trim().min(1).max(64).optional()
});

interface CaptureRouteProps {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/payments/orders/[orderId]/capture
 * Подтверждает (захватывает средства) заказ на стороне активного платежного провайдера.
 */
async function postHandler(request: Request, { params }: Readonly<CaptureRouteProps>) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const payload = captureRequestSchema.safeParse(await request.json().catch(() => ({})));
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        userId: session.user.id,
        ...(payload.success && payload.data.provider ? { provider: payload.data.provider } : {})
      },
      select: {
        provider: true,
        status: true,
        userId: true
      }
    });

    if (!payment || payment.userId !== session.user.id) {
      return NextResponse.json({ message: 'Payment order not found' }, { status: 404 });
    }

    if (payment.status === 'COMPLETED') {
      return NextResponse.json({ success: true });
    }

    const paymentService = await getPaymentService(payment.provider);

    if (
      payment.provider !== paymentService.providerName ||
      !CAPTURABLE_PAYMENT_STATUSES.has(payment.status)
    ) {
      return NextResponse.json(
        { message: 'Payment order cannot be captured in its current state' },
        { status: 409 }
      );
    }

    await paymentService.captureOrder({ orderId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to capture payment order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
