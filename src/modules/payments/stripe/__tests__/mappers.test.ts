import { describe, expect, it } from 'vitest';

import {
  fromStripeMinorUnits,
  getStripePaymentStatus,
  toStripeMinorUnits
} from '@/modules/payments/stripe/mappers';

describe('Stripe money and status mappers', () => {
  it('конвертирует сумму в минимальные денежные единицы без потери точности', () => {
    expect(toStripeMinorUnits('125.45', 'EUR')).toBe(12_545);
    expect(fromStripeMinorUnits(12_545).toFixed(2)).toBe('125.45');
  });

  it('отклоняет валюту вне явно поддерживаемого списка', () => {
    expect(() => toStripeMinorUnits('10.00', 'JPY')).toThrow(
      'Stripe currency JPY is not supported'
    );
  });

  it('нормализует статус ручного capture как одобренный', () => {
    expect(getStripePaymentStatus('requires_capture')).toBe('APPROVED');
    expect(getStripePaymentStatus('succeeded')).toBe('COMPLETED');
  });
});
