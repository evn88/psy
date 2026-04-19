import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getPaymentService, getActivePaymentCurrency } from '@/shared/lib/payments/factory';

const createOrderSchema = z.object({
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
    .optional(),
  description: z.string().trim().max(127).optional(),
  kind: z.enum(['CHECKOUT', 'TOPUP']).optional(),
  servicePackageId: z.string().optional()
});

/**
 * POST /api/payments/orders
 * Создаёт order в активной платежной системе (через фабрику).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = createOrderSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json(
        {
          message: 'Validation error',
          error: payload.error.flatten()
        },
        { status: 400 }
      );
    }

    const paymentService = getPaymentService();
    // Используем дефолтную валюту провайдера если не передана
    const currency = payload.data.currency || getActivePaymentCurrency();

    const order = await paymentService.createOrder({
      amount: payload.data.amount,
      currency: currency,
      description: payload.data.description,
      userId: session.user.id,
      kind: payload.data.kind,
      servicePackageId: payload.data.servicePackageId
    });

    return NextResponse.json({
      id: order.id,
      status: order.status
    });
  } catch (error: unknown) {
    console.error('Failed to create payment order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
