import 'server-only';

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

/**
 * Возвращает лениво созданный серверный клиент Stripe.
 */
export const getStripeClient = (): Stripe => {
  stripeClient ??= new Stripe(getRequiredEnvironmentVariable('STRIPE_SECRET_KEY'), {
    maxNetworkRetries: 2
  });

  return stripeClient;
};

/**
 * Возвращает публичный ключ Stripe для Elements.
 */
export const getStripePublishableKey = (): string => {
  return getRequiredEnvironmentVariable('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
};

/**
 * Проверяет подпись и десериализует Stripe webhook из исходного body.
 */
export const constructStripeWebhookEvent = (payload: string, signature: string): Stripe.Event => {
  return getStripeClient().webhooks.constructEvent(
    payload,
    signature,
    getRequiredEnvironmentVariable('STRIPE_WEBHOOK_SECRET')
  );
};
