import { z } from 'zod';

import { StripeService } from '@/modules/payments/providers/stripe-service';
import { getStripeClient, getStripePublishableKey } from '@/modules/payments/stripe/client.server';
import { STRIPE_PROVIDER_ID } from '@/modules/payments/types';

import type { PaymentConnector } from '../types';
import { STRIPE_DEFAULT_CURRENCY, STRIPE_SUPPORTED_CURRENCIES } from './constants';

const stripeSettingsSchema = z.object({
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform(value => value.toUpperCase())
    .refine(
      value => STRIPE_SUPPORTED_CURRENCIES.includes(value),
      'Currency is not supported by Stripe'
    )
});

/**
 * Коннектор Stripe: конфигурация, checkout и проверка server credentials.
 */
export const stripeConnector: PaymentConnector = {
  metadata: {
    id: STRIPE_PROVIDER_ID,
    label: 'Stripe',
    description: 'Stripe Payment Element, ручной capture, возвраты и webhook-синхронизация.',
    capabilities: ['card', 'checkout', 'refund', 'sync', 'topup', 'webhook'],
    requiredEnvironmentVariables: [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ],
    supportedCurrencies: [...STRIPE_SUPPORTED_CURRENCIES],
    settingsFields: [
      {
        key: 'defaultCurrency',
        label: 'Валюта по умолчанию',
        description: 'Используется для пополнения баланса и как резервная валюта checkout.',
        type: 'select',
        options: STRIPE_SUPPORTED_CURRENCIES.map(currency => ({
          label: currency,
          value: currency
        }))
      }
    ]
  },
  settingsSchema: stripeSettingsSchema as z.ZodType<Record<string, unknown>>,
  defaultSettings: {
    defaultCurrency: STRIPE_DEFAULT_CURRENCY
  },
  createService: () => new StripeService(),
  getCheckoutConfig: settings => {
    const parsedSettings = stripeSettingsSchema.parse(settings);

    return {
      id: STRIPE_PROVIDER_ID,
      label: 'Stripe',
      checkoutKind: 'stripe-elements',
      publishableKey: getStripePublishableKey(),
      defaultCurrency: parsedSettings.defaultCurrency,
      supportedCurrencies: [...STRIPE_SUPPORTED_CURRENCIES],
      capabilities: ['card', 'checkout', 'refund', 'sync', 'topup', 'webhook']
    };
  },
  testConnection: async () => {
    const missingVariables = [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ].filter(name => !process.env[name]?.trim());

    if (missingVariables.length > 0) {
      return {
        status: 'error',
        message: `Не заданы переменные: ${missingVariables.join(', ')}`
      };
    }

    try {
      await getStripeClient().balance.retrieve();
      return {
        status: 'configured',
        message: 'Соединение со Stripe установлено'
      };
    } catch {
      return {
        status: 'error',
        message: 'Stripe отклонил проверку credentials'
      };
    }
  }
};
