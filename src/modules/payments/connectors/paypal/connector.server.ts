import { z } from 'zod';

import {
  getPayPalClientId,
  getPayPalDefaultCurrency,
  getPayPalEnvironment
} from '@/modules/payments/paypal/config';
import { getPayPalAccessToken } from '@/modules/payments/paypal/client';
import { PayPalService } from '@/modules/payments/providers/paypal-service';
import { PAYPAL_PROVIDER_ID } from '@/modules/payments/types';

import type { PaymentConnector } from '../types';
import { PAYPAL_SUPPORTED_CURRENCIES } from './constants';

const payPalSettingsSchema = z.object({
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform(value => value.toUpperCase())
    .refine(
      value => PAYPAL_SUPPORTED_CURRENCIES.includes(value),
      'Currency is not supported by PayPal'
    )
});

export type PayPalConnectorSettings = z.infer<typeof payPalSettingsSchema>;

/**
 * Коннектор PayPal. Все PayPal-специфичные знания сосредоточены в этой папке.
 */
export const payPalConnector: PaymentConnector = {
  metadata: {
    id: PAYPAL_PROVIDER_ID,
    label: 'PayPal',
    description: 'PayPal Checkout, оплата картой через PayPal и синхронизация webhook.',
    capabilities: ['card', 'checkout', 'refund', 'sync', 'topup', 'webhook'],
    requiredEnvironmentVariables: [
      'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_WEBHOOK_ID'
    ],
    supportedCurrencies: PAYPAL_SUPPORTED_CURRENCIES,
    settingsFields: [
      {
        key: 'defaultCurrency',
        label: 'Валюта по умолчанию',
        description: 'Используется для пополнения баланса и как резервная валюта checkout.',
        type: 'text'
      }
    ]
  },
  settingsSchema: payPalSettingsSchema as z.ZodType<Record<string, unknown>>,
  defaultSettings: {
    defaultCurrency: getPayPalDefaultCurrency()
  },
  createService: () => new PayPalService(),
  getCheckoutConfig: settings => {
    const parsedSettings = payPalSettingsSchema.parse(settings);

    return {
      id: PAYPAL_PROVIDER_ID,
      label: 'PayPal',
      checkoutKind: 'paypal',
      clientId: getPayPalClientId(),
      defaultCurrency: parsedSettings.defaultCurrency,
      supportedCurrencies: PAYPAL_SUPPORTED_CURRENCIES,
      capabilities: ['card', 'checkout', 'refund', 'sync', 'topup', 'webhook']
    };
  },
  testConnection: async () => {
    const missingVariables = [
      'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_WEBHOOK_ID'
    ].filter(name => !process.env[name]?.trim());

    if (missingVariables.length > 0) {
      return {
        status: 'error',
        message: `Не заданы переменные: ${missingVariables.join(', ')}`
      };
    }

    try {
      await getPayPalAccessToken();
      return {
        status: 'configured',
        message: `Соединение установлено, окружение: ${getPayPalEnvironment()}`
      };
    } catch {
      return {
        status: 'error',
        message: 'PayPal отклонил проверку credentials'
      };
    }
  }
};
