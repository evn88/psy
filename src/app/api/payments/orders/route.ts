import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getPaymentService } from '@/modules/payments/factory';
import { FINANCIAL_CURRENCY } from '@/modules/payments/financial/constants';
import type { CreateOrderParams } from '@/modules/payments/types';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

const topupAmountSchema = z
  .string()
  .trim()
  .max(13)
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Amount must be a valid monetary value')
  .refine(value => new Prisma.Decimal(value).greaterThan(0), 'Amount must be greater than zero');

const createOrderSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('CHECKOUT'),
    provider: z.string().trim().min(1).max(64).optional(),
    servicePackageId: z.string().trim().min(1).max(128)
  }),
  z.object({
    kind: z.literal('TOPUP'),
    provider: z.string().trim().min(1).max(64).optional(),
    amount: topupAmountSchema,
    description: z.string().trim().max(127).optional()
  })
]);

/**
 * Возвращает стабильное серверное описание пакета для PayPal.
 */
const getPackageDescription = (title: Prisma.JsonValue): string => {
  if (typeof title === 'string' && title.trim()) {
    return title.trim().slice(0, 127);
  }

  if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
    for (const locale of ['ru', 'en', 'sr']) {
      const localizedTitle = title[locale];

      if (typeof localizedTitle === 'string' && localizedTitle.trim()) {
        return localizedTitle.trim().slice(0, 127);
      }
    }
  }

  return 'Service package';
};

/**
 * POST /api/payments/orders
 * Создаёт order в активной платежной системе (через фабрику).
 */
async function postHandler(request: Request) {
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

    let orderInput: Omit<CreateOrderParams, 'userId'> | null;

    if (payload.data.kind === 'CHECKOUT') {
      const servicePackage = await prisma.servicePackage.findFirst({
        where: {
          id: payload.data.servicePackageId,
          isActive: true,
          currency: FINANCIAL_CURRENCY
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          title: true
        }
      });

      orderInput = servicePackage
        ? {
            amount: servicePackage.amount.toFixed(2),
            currency: servicePackage.currency.toUpperCase(),
            description: getPackageDescription(servicePackage.title),
            kind: 'CHECKOUT',
            servicePackageId: servicePackage.id
          }
        : null;
    } else {
      orderInput = {
        amount: payload.data.amount,
        currency: FINANCIAL_CURRENCY,
        description: payload.data.description || 'Пополнение баланса',
        kind: 'TOPUP'
      };
    }

    if (!orderInput) {
      return NextResponse.json({ message: 'Service package not found' }, { status: 404 });
    }

    let paymentService;

    try {
      paymentService = await getPaymentService(payload.data.provider, {
        requireEnabled: true
      });
    } catch {
      return NextResponse.json(
        { message: 'Selected payment provider is unavailable' },
        { status: 409 }
      );
    }

    if (!paymentService.supportsCurrency(orderInput.currency)) {
      return NextResponse.json(
        { message: 'Selected payment provider does not support this currency' },
        { status: 409 }
      );
    }

    const order = await paymentService.createOrder({
      userId: session.user.id,
      ...orderInput
    });

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Failed to create payment order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
