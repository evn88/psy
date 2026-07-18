import type { Payment, PaymentKind } from '@prisma/client';

export const PAYPAL_PROVIDER_ID = 'PAYPAL' as const;

export type PaymentProviderId = string;

export type PaymentProviderCapability =
  | 'card'
  | 'checkout'
  | 'refund'
  | 'sync'
  | 'topup'
  | 'webhook';

export type PaymentProviderHealthStatus = 'configured' | 'error' | 'unknown';

export interface PaymentProviderCheckoutConfig {
  id: PaymentProviderId;
  label: string;
  checkoutKind: 'paypal';
  clientId: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  capabilities: PaymentProviderCapability[];
}

export interface CreateOrderParams {
  amount: string;
  currency: string;
  description?: string;
  userId: string;
  kind?: PaymentKind;
  servicePackageId?: string;
}

export interface CaptureOrderParams {
  orderId: string;
}

export type SyncPaymentParams = Pick<
  Payment,
  | 'amount'
  | 'balanceCreditedAt'
  | 'captureId'
  | 'currency'
  | 'id'
  | 'kind'
  | 'orderId'
  | 'refundedAmount'
  | 'servicePackageId'
  | 'status'
  | 'userId'
>;

export interface OrderResponse {
  id: string;
  status: string;
}

export interface IPaymentService {
  /**
   * Идентификатор провайдера.
   */
  get providerName(): PaymentProviderId;

  /**
   * Создает новый ордер/транзакцию в платёжной системе.
   */
  createOrder(params: CreateOrderParams): Promise<OrderResponse>;

  /**
   * Подтверждает (захватывает средства) ордера.
   */
  captureOrder(params: CaptureOrderParams): Promise<void>;

  /**
   * Проверяет поддержку валюты до создания внешней операции.
   */
  supportsCurrency(currency: string): boolean;

  /**
   * Сверяет локальную операцию с внешним провайдером.
   */
  syncPayment(payment: SyncPaymentParams): Promise<Payment>;
}
