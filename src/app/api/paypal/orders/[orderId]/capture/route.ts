import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { capturePayPalOrder, getPayPalOrder } from '@/shared/lib/paypal/client';
import {
  getPrimaryCaptureFromOrder,
  syncPaymentFromPayPal,
  syncPaymentWithPayPal
} from '@/shared/lib/paypal/service';
import { PayPalApiError } from '@/shared/lib/paypal/types';

interface CapturePayPalOrderRouteProps {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/paypal/orders/[orderId]/capture
 * Выполняет capture в PayPal и обновляет локальный платёж.
 */
export async function POST(_request: Request, { params }: CapturePayPalOrderRouteProps) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: {
        id: true,
        userId: true,
        orderId: true,
        captureId: true,
        kind: true,
        status: true
      }
    });

    if (!payment || payment.userId !== session.user.id) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    if (payment.captureId && payment.status === 'COMPLETED') {
      const syncedPayment = await syncPaymentWithPayPal(payment);

      return NextResponse.json({
        orderId: syncedPayment.orderId,
        captureId: syncedPayment.captureId,
        status: syncedPayment.status
      });
    }

    let order;

    try {
      order = await capturePayPalOrder(orderId);
    } catch (error: unknown) {
      if (error instanceof PayPalApiError && error.status === 422) {
        order = await getPayPalOrder(orderId);
      } else {
        throw error;
      }
    }

    const capture = getPrimaryCaptureFromOrder(order);
    const syncedPayment = await syncPaymentFromPayPal({
      order,
      capture,
      paymentId: payment.id,
      userId: payment.userId,
      kind: payment.kind
    });

    return NextResponse.json({
      orderId: syncedPayment.orderId,
      captureId: syncedPayment.captureId,
      status: syncedPayment.status
    });
  } catch (error: unknown) {
    console.error('Failed to capture PayPal order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
