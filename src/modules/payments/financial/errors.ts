export type FinancialErrorCode =
  | 'CONSULTATION_RATE_NOT_CONFIGURED'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_PACKAGE_MINUTES'
  | 'INVALID_CURRENCY'
  | 'INVALID_FINANCIAL_AMOUNT'
  | 'INVALID_PACKAGE'
  | 'INVALID_PACKAGE_ADJUSTMENT'
  | 'PACKAGE_NOT_AVAILABLE';

/**
 * Ожидаемая доменная ошибка финансовой операции.
 */
export class FinancialDomainError extends Error {
  constructor(
    public readonly code: FinancialErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'FinancialDomainError';
  }
}
