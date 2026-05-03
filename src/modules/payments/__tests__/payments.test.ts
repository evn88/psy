import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { getCurrentMonthPaymentsTotal, getYearlyPaymentsSeries } from '@/modules/payments';

describe('payments analytics helpers', () => {
  it('корректно считает сумму подтверждённых платежей за текущий месяц', () => {
    // Arrange
    const now = new Date('2026-04-14T12:00:00.000Z');
    const payments = [
      {
        amount: new Prisma.Decimal('120.00'),
        currency: 'EUR',
        status: 'COMPLETED',
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        capturedAt: new Date('2026-04-01T09:05:00.000Z')
      },
      {
        amount: new Prisma.Decimal('80.00'),
        currency: 'EUR',
        status: 'PARTIALLY_REFUNDED',
        createdAt: new Date('2026-04-10T09:00:00.000Z'),
        capturedAt: new Date('2026-04-10T09:05:00.000Z')
      },
      {
        amount: new Prisma.Decimal('90.00'),
        currency: 'EUR',
        status: 'REFUNDED',
        createdAt: new Date('2026-04-11T09:00:00.000Z'),
        capturedAt: new Date('2026-04-11T09:05:00.000Z')
      },
      {
        amount: new Prisma.Decimal('60.00'),
        currency: 'EUR',
        status: 'COMPLETED',
        createdAt: new Date('2026-03-30T09:00:00.000Z'),
        capturedAt: new Date('2026-03-30T09:05:00.000Z')
      }
    ];

    // Act
    const total = getCurrentMonthPaymentsTotal(payments, now);

    // Assert
    expect(total).toBe(200);
  });

  it('строит полный ряд по месяцам за год с нулевыми промежутками', () => {
    // Arrange
    const payments = [
      {
        amount: new Prisma.Decimal('100.00'),
        currency: 'EUR',
        status: 'COMPLETED',
        createdAt: new Date('2026-01-15T09:00:00.000Z'),
        capturedAt: new Date('2026-01-15T09:05:00.000Z')
      },
      {
        amount: new Prisma.Decimal('50.00'),
        currency: 'EUR',
        status: 'COMPLETED',
        createdAt: new Date('2026-04-02T09:00:00.000Z'),
        capturedAt: new Date('2026-04-02T09:05:00.000Z')
      },
      {
        amount: new Prisma.Decimal('25.00'),
        currency: 'EUR',
        status: 'FAILED',
        createdAt: new Date('2026-04-10T09:00:00.000Z'),
        capturedAt: new Date('2026-04-10T09:05:00.000Z')
      }
    ];

    // Act
    const series = getYearlyPaymentsSeries(payments, 2026);

    // Assert
    expect(series).toHaveLength(12);
    expect(series[0]).toMatchObject({ monthLabel: 'Янв', total: 100 });
    expect(series[3]).toMatchObject({ monthLabel: 'Апр', total: 50 });
    expect(series[5]).toMatchObject({ monthLabel: 'Июн', total: 0 });
  });
});
