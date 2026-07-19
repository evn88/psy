import { PaymentKind, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPayPalCapture: vi.fn(),
  getPayPalOrder: vi.fn()
}));

vi.mock('server-only', () => ({}));

vi.mock('@/modules/payments/paypal/client', () => ({
  capturePayPalOrder: vi.fn(),
  createPayPalOrder: vi.fn(),
  getPayPalCapture: mocks.getPayPalCapture,
  getPayPalOrder: mocks.getPayPalOrder,
  refundPayPalCapture: vi.fn()
}));

vi.mock('@/modules/payments/paypal/service', () => ({
  syncPaymentFromPayPal: vi.fn(),
  syncPaymentWithPayPal: vi.fn()
}));

vi.mock('@/modules/payments/financial/financial-service.server', () => ({
  applyConfirmedProviderRefund: vi.fn()
}));

import { PayPalApiError } from '@/modules/payments/paypal/types';
import { PayPalService } from '@/modules/payments/providers/paypal-service';

const payment = {
  amount: new Prisma.Decimal('50.00'),
  balanceCreditedAt: null,
  captureId: null,
  currency: 'EUR',
  fulfilledAt: null,
  id: 'payment-1',
  kind: PaymentKind.TOPUP,
  orderId: 'order-1',
  refundedAmount: new Prisma.Decimal(0),
  servicePackageId: null,
  status: 'CREATED',
  userId: 'user-1'
};

describe('PayPalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('подтверждает существование заказа PayPal', async () => {
    mocks.getPayPalOrder.mockResolvedValue({ id: 'order-1', status: 'CREATED' });
    const service = new PayPalService();

    await expect(service.paymentExists(payment)).resolves.toBe(true);
  });

  it('считает заказ отсутствующим только после ответа PayPal 404', async () => {
    mocks.getPayPalOrder.mockRejectedValue(new PayPalApiError('Not found', 404, null));
    const service = new PayPalService();

    await expect(service.paymentExists(payment)).resolves.toBe(false);
  });

  it('не разрешает удаление при сетевой или серверной ошибке PayPal', async () => {
    const providerError = new PayPalApiError('Unavailable', 503, null);
    mocks.getPayPalOrder.mockRejectedValue(providerError);
    const service = new PayPalService();

    await expect(service.paymentExists(payment)).rejects.toBe(providerError);
  });
});
