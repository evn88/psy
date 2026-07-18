import { PaymentKind } from '@prisma/client';
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  syncPaymentFromStripe: vi.fn(),
  syncPaymentWithStripe: vi.fn()
}));

vi.mock('server-only', () => ({}));

vi.mock('@/modules/payments/stripe/client.server', () => ({
  getStripeClient: () => ({
    paymentIntents: {
      capture: mocks.capture,
      create: mocks.create,
      retrieve: mocks.retrieve
    }
  })
}));

vi.mock('@/modules/payments/stripe/service.server', () => ({
  syncPaymentFromStripe: mocks.syncPaymentFromStripe,
  syncPaymentWithStripe: mocks.syncPaymentWithStripe
}));

import { StripeService } from '@/modules/payments/providers/stripe-service';

const createPaymentIntent = (
  status: Stripe.PaymentIntent.Status = 'requires_payment_method'
): Stripe.PaymentIntent => {
  return {
    id: 'pi_1',
    object: 'payment_intent',
    amount: 5_025,
    amount_capturable: 0,
    amount_details: {},
    amount_received: 0,
    automatic_payment_methods: { allow_redirects: 'always', enabled: true },
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'manual',
    client_secret: 'pi_1_secret',
    confirmation_method: 'automatic',
    created: 1_753_000_000,
    currency: 'eur',
    customer: null,
    description: 'Пополнение',
    excluded_payment_method_types: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: {},
    next_action: null,
    payment_method: null,
    payment_method_configuration_details: null,
    payment_method_options: {},
    payment_method_types: ['card'],
    processing: null,
    receipt_email: null,
    setup_future_usage: null,
    shipping: null,
    source: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status
  } as unknown as Stripe.PaymentIntent;
};

describe('StripeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncPaymentFromStripe.mockResolvedValue({});
  });

  it('создаёт PaymentIntent с manual capture и серверными metadata', async () => {
    mocks.create.mockResolvedValue(createPaymentIntent());
    const service = new StripeService();

    const order = await service.createOrder({
      amount: '50.25',
      currency: 'EUR',
      description: 'Пополнение',
      userId: 'user-1',
      kind: PaymentKind.TOPUP
    });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5_025,
        currency: 'eur',
        capture_method: 'manual',
        metadata: expect.objectContaining({
          userId: 'user-1',
          kind: 'TOPUP'
        })
      }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^payment:create:/) })
    );
    expect(order).toEqual({
      checkoutKind: 'stripe-elements',
      id: 'pi_1',
      status: 'requires_payment_method',
      clientSecret: 'pi_1_secret'
    });
  });

  it('захватывает подтверждённый PaymentIntent идемпотентным запросом', async () => {
    const approvedPaymentIntent = createPaymentIntent('requires_capture');
    const completedPaymentIntent = createPaymentIntent('succeeded');
    mocks.retrieve.mockResolvedValue(approvedPaymentIntent);
    mocks.capture.mockResolvedValue(completedPaymentIntent);
    const service = new StripeService();

    await service.captureOrder({ orderId: 'pi_1' });

    expect(mocks.capture).toHaveBeenCalledWith(
      'pi_1',
      { expand: ['latest_charge'] },
      { idempotencyKey: 'payment:capture:pi_1' }
    );
    expect(mocks.syncPaymentFromStripe).toHaveBeenCalledWith({
      paymentIntent: completedPaymentIntent
    });
  });
});
