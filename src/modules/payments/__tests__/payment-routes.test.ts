import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  captureOrder: vi.fn(),
  createOrder: vi.fn(),
  findPayment: vi.fn(),
  findServicePackage: vi.fn(),
  getActivePaymentCurrency: vi.fn(),
  getPaymentService: vi.fn()
}));

vi.mock('@/auth', () => ({
  auth: mocks.auth
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    payment: {
      findFirst: mocks.findPayment
    },
    servicePackage: {
      findFirst: mocks.findServicePackage
    }
  }
}));

vi.mock('@/modules/payments/factory', () => ({
  getActivePaymentCurrency: mocks.getActivePaymentCurrency,
  getPaymentService: mocks.getPaymentService
}));

vi.mock('@/modules/system-logs/with-api-logging.server', () => ({
  withApiLogging: (handler: unknown) => handler
}));

import { POST as captureOrder } from '@/app/api/payments/orders/[orderId]/capture/route';
import { POST as createOrder } from '@/app/api/payments/orders/route';

describe('payment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1'
      }
    });
    mocks.createOrder.mockResolvedValue({
      id: 'order-1',
      status: 'CREATED'
    });
    mocks.captureOrder.mockResolvedValue(undefined);
    mocks.getActivePaymentCurrency.mockReturnValue('EUR');
    mocks.getPaymentService.mockResolvedValue({
      providerName: 'PAYPAL',
      supportsCurrency: () => true,
      captureOrder: mocks.captureOrder,
      createOrder: mocks.createOrder
    });
  });

  it('создаёт CHECKOUT только по активному пакету и игнорирует клиентскую цену', async () => {
    mocks.findServicePackage.mockResolvedValue({
      id: 'package-1',
      amount: new Prisma.Decimal('125.00'),
      currency: 'EUR',
      title: {
        ru: 'Пакет консультаций'
      }
    });

    const response = await createOrder(
      new Request('http://localhost/api/payments/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'CHECKOUT',
          servicePackageId: 'package-1',
          amount: '0.01',
          currency: 'USD',
          description: 'Подменённое описание'
        })
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(200);
    expect(mocks.findServicePackage).toHaveBeenCalledWith({
      where: {
        id: 'package-1',
        isActive: true,
        currency: 'EUR'
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        title: true
      }
    });
    expect(mocks.createOrder).toHaveBeenCalledWith({
      amount: '125.00',
      currency: 'EUR',
      description: 'Пакет консультаций',
      kind: 'CHECKOUT',
      servicePackageId: 'package-1',
      userId: 'user-1'
    });
  });

  it('не создаёт CHECKOUT для отсутствующего или выключенного пакета', async () => {
    mocks.findServicePackage.mockResolvedValue(null);

    const response = await createOrder(
      new Request('http://localhost/api/payments/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'CHECKOUT',
          servicePackageId: 'package-disabled'
        })
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(404);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('передаёт выбранного провайдера в registry', async () => {
    mocks.findServicePackage.mockResolvedValue({
      id: 'package-1',
      amount: new Prisma.Decimal('80.00'),
      currency: 'EUR',
      title: { ru: 'Консультация' }
    });

    const response = await createOrder(
      new Request('http://localhost/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'CHECKOUT',
          provider: 'STRIPE',
          servicePackageId: 'package-1'
        })
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(200);
    expect(mocks.getPaymentService).toHaveBeenCalledWith('STRIPE', {
      requireEnabled: true
    });
  });

  it('валидирует TOPUP отдельно и использует серверную валюту', async () => {
    const response = await createOrder(
      new Request('http://localhost/api/payments/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'TOPUP',
          amount: '50.25',
          currency: 'USD',
          servicePackageId: 'package-1',
          description: 'Пополнение'
        })
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(200);
    expect(mocks.findServicePackage).not.toHaveBeenCalled();
    expect(mocks.createOrder).toHaveBeenCalledWith({
      amount: '50.25',
      currency: 'EUR',
      description: 'Пополнение',
      kind: 'TOPUP',
      userId: 'user-1'
    });
  });

  it('отклоняет TOPUP с нулевой суммой', async () => {
    const response = await createOrder(
      new Request('http://localhost/api/payments/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'TOPUP',
          amount: '0.00'
        })
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('не позволяет захватить order другого пользователя', async () => {
    mocks.findPayment.mockResolvedValue({
      provider: 'PAYPAL',
      status: 'CREATED',
      userId: 'user-2'
    });

    const response = await captureOrder(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'order-1' })
    });

    expect(response.status).toBe(404);
    expect(mocks.captureOrder).not.toHaveBeenCalled();
  });

  it('отклоняет capture в недопустимом состоянии', async () => {
    mocks.findPayment.mockResolvedValue({
      provider: 'PAYPAL',
      status: 'VOIDED',
      userId: 'user-1'
    });

    const response = await captureOrder(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'order-1' })
    });

    expect(response.status).toBe(409);
    expect(mocks.captureOrder).not.toHaveBeenCalled();
  });

  it('повторный capture завершённого собственного order идемпотентен', async () => {
    mocks.findPayment.mockResolvedValue({
      provider: 'PAYPAL',
      status: 'COMPLETED',
      userId: 'user-1'
    });

    const response = await captureOrder(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'order-1' })
    });

    expect(response.status).toBe(200);
    expect(mocks.captureOrder).not.toHaveBeenCalled();
  });
});
