import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPaymentService } from '@/shared/lib/payments/factory';

interface CaptureRouteProps {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/payments/orders/[orderId]/capture
 * Подтверждает (захватывает средства) заказ на стороне активного платежного провайдера.
 */
export async function POST(request: Request, { params }: Readonly<CaptureRouteProps>) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const paymentService = getPaymentService();

    await paymentService.captureOrder({ orderId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to capture payment order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
