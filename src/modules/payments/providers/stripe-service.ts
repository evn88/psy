import { randomUUID } from 'node:crypto';

import { getStripeClient } from '@/modules/payments/stripe/client.server';
import { toStripeMinorUnits } from '@/modules/payments/stripe/mappers';
import {
  syncPaymentFromStripe,
  syncPaymentWithStripe
} from '@/modules/payments/stripe/service.server';
import type {
  CaptureOrderParams,
  CreateOrderParams,
  IPaymentService,
  OrderResponse,
  RefundPaymentParams
} from '@/modules/payments/types';
import { STRIPE_PROVIDER_ID } from '@/modules/payments/types';

import { STRIPE_SUPPORTED_CURRENCIES } from '../connectors/stripe/constants';

export class StripeService implements IPaymentService {
  get providerName(): string {
    return STRIPE_PROVIDER_ID;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const paymentId = randomUUID();
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: toStripeMinorUnits(params.amount, params.currency),
        currency: params.currency.toLowerCase(),
        capture_method: 'manual',
        automatic_payment_methods: { enabled: true },
        description: params.description,
        metadata: {
          paymentId,
          userId: params.userId,
          kind: params.kind ?? 'CHECKOUT',
          ...(params.servicePackageId ? { servicePackageId: params.servicePackageId } : {})
        },
        expand: ['latest_charge']
      },
      { idempotencyKey: `payment:create:${paymentId}` }
    );

    await syncPaymentFromStripe({
      paymentIntent,
      userId: params.userId,
      paymentId,
      kind: params.kind,
      servicePackageId: params.servicePackageId
    });

    if (!paymentIntent.client_secret) {
      throw new Error(`Stripe did not return client secret for ${paymentIntent.id}`);
    }

    return {
      checkoutKind: 'stripe-elements',
      id: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    };
  }

  async captureOrder(params: CaptureOrderParams): Promise<void> {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(params.orderId, {
      expand: ['latest_charge']
    });
    const capturedPaymentIntent =
      paymentIntent.status === 'requires_capture'
        ? await stripe.paymentIntents.capture(
            paymentIntent.id,
            { expand: ['latest_charge'] },
            { idempotencyKey: `payment:capture:${paymentIntent.id}` }
          )
        : paymentIntent;

    if (!['requires_capture', 'succeeded'].includes(paymentIntent.status)) {
      throw new Error(`Stripe PaymentIntent ${paymentIntent.id} cannot be captured`);
    }

    await syncPaymentFromStripe({ paymentIntent: capturedPaymentIntent });
  }

  async refundPayment(params: RefundPaymentParams) {
    const stripe = getStripeClient();

    await stripe.refunds.create(
      {
        payment_intent: params.payment.orderId,
        ...(params.amount
          ? {
              amount: toStripeMinorUnits(params.amount, params.payment.currency)
            }
          : {})
      },
      {
        idempotencyKey: params.idempotencyKey
      }
    );

    return syncPaymentWithStripe(params.payment);
  }

  async paymentExists(payment: Parameters<IPaymentService['paymentExists']>[0]): Promise<boolean> {
    try {
      await getStripeClient().paymentIntents.retrieve(payment.orderId);
      return true;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        'code' in error &&
        error.statusCode === 404 &&
        error.code === 'resource_missing'
      ) {
        return false;
      }
      throw error;
    }
  }

  supportsCurrency(currency: string): boolean {
    return STRIPE_SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
  }

  async syncPayment(
    payment: Parameters<IPaymentService['syncPayment']>[0]
  ): ReturnType<IPaymentService['syncPayment']> {
    return syncPaymentWithStripe(payment);
  }
}
