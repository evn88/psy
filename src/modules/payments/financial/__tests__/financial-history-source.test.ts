import { describe, expect, it } from 'vitest';

import {
  getFinancialHistorySourceLabel,
  resolveFinancialHistorySource
} from '../financial-history-source';

describe('источник записи финансовой истории', () => {
  it('помечает ручную проводку как корректировку администратора', () => {
    const source = resolveFinancialHistorySource({
      isAdminAdjustment: true,
      provider: null
    });

    expect(source).toBe('ADMIN_ADJUSTMENT');
    expect(getFinancialHistorySourceLabel(source)).toBe('Корректировка администратора');
  });

  it('помечает связанную оплату как операцию платёжного шлюза', () => {
    const source = resolveFinancialHistorySource({
      isAdminAdjustment: false,
      provider: 'stripe'
    });

    expect(source).toBe('PAYMENT_PROVIDER');
    expect(getFinancialHistorySourceLabel(source, 'Stripe')).toBe('Платёжный шлюз · Stripe');
  });

  it('не относит внутреннее списание к платёжному шлюзу', () => {
    const source = resolveFinancialHistorySource({
      isAdminAdjustment: false,
      provider: null
    });

    expect(source).toBe('INTERNAL_OPERATION');
    expect(getFinancialHistorySourceLabel(source)).toBe('Внутренняя операция');
  });
});
