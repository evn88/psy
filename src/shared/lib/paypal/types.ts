/**
 * Денежная сумма PayPal.
 */
export interface PayPalMoney {
  currency_code: string;
  value: string;
}

/**
 * Идентификаторы связанных сущностей PayPal.
 */
export interface PayPalRelatedIds {
  order_id?: string;
  authorization_id?: string;
  capture_id?: string;
}

/**
 * Дополнительные данные PayPal-ресурсов.
 */
export interface PayPalSupplementaryData {
  related_ids?: PayPalRelatedIds;
}

/**
 * Захват платежа PayPal.
 */
export interface PayPalCapture {
  id: string;
  status: string;
  amount?: PayPalMoney;
  invoice_id?: string;
  custom_id?: string;
  create_time?: string;
  update_time?: string;
  supplementary_data?: PayPalSupplementaryData;
}

/**
 * Коллекция захватов в purchase unit.
 */
export interface PayPalPurchaseUnitPayments {
  captures?: PayPalCapture[];
}

/**
 * Purchase unit заказа PayPal.
 */
export interface PayPalPurchaseUnit {
  reference_id?: string;
  description?: string;
  custom_id?: string;
  invoice_id?: string;
  amount?: PayPalMoney;
  payments?: PayPalPurchaseUnitPayments;
}

/**
 * Информация о плательщике PayPal.
 */
export interface PayPalPayer {
  email_address?: string;
  payer_id?: string;
}

/**
 * Заказ PayPal.
 */
export interface PayPalOrder {
  id: string;
  status: string;
  intent?: string;
  payer?: PayPalPayer;
  purchase_units?: PayPalPurchaseUnit[];
  create_time?: string;
  update_time?: string;
}

/**
 * Возврат PayPal.
 */
export interface PayPalRefund {
  id: string;
  status?: string;
  amount?: PayPalMoney;
  create_time?: string;
  update_time?: string;
  supplementary_data?: PayPalSupplementaryData;
}

/**
 * Спор PayPal.
 */
export interface PayPalDispute {
  dispute_id?: string;
  status?: string;
  dispute_life_cycle_stage?: string;
  reason?: string;
  dispute_amount?: PayPalMoney;
  create_time?: string;
  update_time?: string;
  disputed_transactions?: Array<{
    seller_transaction_id?: string;
    buyer_transaction_id?: string;
    gross_amount?: PayPalMoney;
  }>;
  messages?: unknown[];
}

/**
 * Ресурс webhook-события PayPal.
 */
export type PayPalWebhookResource = Record<string, unknown>;

/**
 * Webhook-событие PayPal.
 */
export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type?: string;
  summary?: string;
  create_time?: string;
  resource: PayPalWebhookResource;
}

/**
 * Ответ PayPal при проверке webhook-подписи.
 */
export interface PayPalWebhookVerificationResponse {
  verification_status: 'SUCCESS' | 'FAILURE';
}

/**
 * Ошибка API PayPal с полезной нагрузкой ответа.
 */
export class PayPalApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = status;
    this.payload = payload;
  }
}
