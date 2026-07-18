export type FinancialHistorySource = 'ADMIN_ADJUSTMENT' | 'PAYMENT_PROVIDER' | 'INTERNAL_OPERATION';

interface ResolveFinancialHistorySourceParams {
  isAdminAdjustment: boolean;
  provider: string | null;
}

/**
 * Определяет источник записи финансовой истории по неизменяемым связям ledger.
 */
export const resolveFinancialHistorySource = ({
  isAdminAdjustment,
  provider
}: ResolveFinancialHistorySourceParams): FinancialHistorySource => {
  if (isAdminAdjustment) return 'ADMIN_ADJUSTMENT';
  if (provider) return 'PAYMENT_PROVIDER';
  return 'INTERNAL_OPERATION';
};

/**
 * Возвращает понятное пользователю название источника финансовой операции.
 */
export const getFinancialHistorySourceLabel = (
  source: FinancialHistorySource,
  providerLabel?: string | null
): string => {
  if (source === 'ADMIN_ADJUSTMENT') return 'Корректировка администратора';
  if (source === 'PAYMENT_PROVIDER') {
    return providerLabel ? `Платёжный шлюз · ${providerLabel}` : 'Платёжный шлюз';
  }
  return 'Внутренняя операция';
};
