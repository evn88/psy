import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    paymentProviderConfig: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      upsert: mocks.upsert
    }
  }
}));

vi.mock('server-only', () => ({}));

vi.mock('@/modules/payments/providers/paypal-service', () => ({
  PayPalService: class {
    providerName = 'PAYPAL';
  }
}));

vi.mock('@/modules/payments/providers/stripe-service', () => ({
  StripeService: class {
    providerName = 'STRIPE';
  }
}));

vi.mock('@/modules/payments/paypal/client', () => ({
  getPayPalAccessToken: vi.fn()
}));

import {
  getEnabledPaymentCheckoutConfigs,
  getPaymentConnector,
  getPaymentService
} from '../registry.server';

describe('payment connector registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'client-id');
    vi.stubEnv('NEXT_PUBLIC_PAYPAL_CURRENCY', 'EUR');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_public');
  });

  it('не разрешает создавать платежи через отключённый коннектор', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'PAYPAL',
      enabled: false,
      isDefault: false,
      settings: null
    });

    await expect(getPaymentConnector('PAYPAL', { requireEnabled: true })).rejects.toThrow(
      'Payment connector PAYPAL is disabled'
    );
  });

  it('выбирает сервис включённого провайдера по умолчанию', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'PAYPAL',
      enabled: true,
      isDefault: true,
      settings: null
    });
    mocks.findUnique.mockResolvedValue({
      id: 'PAYPAL',
      enabled: true,
      isDefault: true,
      settings: null
    });

    const service = await getPaymentService();

    expect(service.providerName).toBe('PAYPAL');
  });

  it('отдаёт клиенту только безопасную конфигурацию checkout', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'PAYPAL',
        enabled: true,
        isDefault: true,
        settings: { defaultCurrency: 'USD' }
      }
    ]);

    const configs = await getEnabledPaymentCheckoutConfigs();

    expect(configs).toEqual([
      expect.objectContaining({
        id: 'PAYPAL',
        clientId: 'client-id',
        defaultCurrency: 'USD'
      })
    ]);
    expect(JSON.stringify(configs)).not.toContain('PAYPAL_CLIENT_SECRET');
  });

  it('отдаёт Stripe publishable key без server credentials', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'STRIPE',
        enabled: true,
        isDefault: true,
        settings: { defaultCurrency: 'EUR' }
      }
    ]);

    const configs = await getEnabledPaymentCheckoutConfigs();

    expect(configs).toEqual([
      expect.objectContaining({
        id: 'STRIPE',
        checkoutKind: 'stripe-elements',
        publishableKey: 'pk_test_public'
      })
    ]);
    expect(JSON.stringify(configs)).not.toContain('STRIPE_SECRET_KEY');
  });
});
