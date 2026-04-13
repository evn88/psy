import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { createPayPalOrder } from '@/shared/lib/paypal/client';
import { getPayPalDefaultCurrency } from '@/shared/lib/paypal/config';
import { syncPaymentFromPayPal } from '@/shared/lib/paypal/service';

const createPayPalOrderSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid monetary value')
    .refine(value => Number(value) > 0, 'Amount must be greater than zero'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be an ISO 4217 code')
    .default(getPayPalDefaultCurrency()),
  description: z.string().trim().max(127).optional()
});

/**
 * POST /api/paypal/orders
 * Создаёт order в PayPal и сохраняет черновую запись платежа в локальной БД.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = createPayPalOrderSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json(
        {
          message: 'Validation error',
          error: payload.error.flatten()
        },
        { status: 400 }
      );
    }

    const paymentId = randomUUID();
    const order = await createPayPalOrder({
      amount: payload.data.amount,
      currency: payload.data.currency,
      description: payload.data.description,
      invoiceId: paymentId,
      customId: session.user.id
    });

    await syncPaymentFromPayPal({
      order,
      userId: session.user.id,
      paymentId
    });

    return NextResponse.json({
      id: order.id,
      status: order.status
    });
  } catch (error: unknown) {
    console.error('Failed to create PayPal order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
