import type { Payment, PaymentKind } from '@prisma/client';

export const PAYPAL_PROVIDER_ID = 'PAYPAL' as const;
export const STRIPE_PROVIDER_ID = 'STRIPE' as const;

export type PaymentProviderId = string;

export type PaymentProviderCapability =
  | 'card'
  | 'checkout'
  | 'refund'
  | 'sync'
  | 'topup'
  | 'webhook';

export type PaymentProviderHealthStatus = 'configured' | 'error' | 'unknown';

interface BasePaymentProviderCheckoutConfig {
  id: PaymentProviderId;
  label: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  capabilities: PaymentProviderCapability[];
}

export interface PayPalCheckoutConfig extends BasePaymentProviderCheckoutConfig {
  checkoutKind: 'paypal';
  clientId: string;
}

export interface StripeCheckoutConfig extends BasePaymentProviderCheckoutConfig {
  checkoutKind: 'stripe-elements';
  publishableKey: string;
}

export type PaymentProviderCheckoutConfig = PayPalCheckoutConfig | StripeCheckoutConfig;

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

interface BaseOrderResponse {
  id: string;
  status: string;
}

export interface PayPalOrderResponse extends BaseOrderResponse {
  checkoutKind: 'paypal';
}

export interface StripeOrderResponse extends BaseOrderResponse {
  checkoutKind: 'stripe-elements';
  clientSecret: string;
}

export type OrderResponse = PayPalOrderResponse | StripeOrderResponse;

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
