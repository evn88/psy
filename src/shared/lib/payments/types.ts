import type { PaymentProvider } from '@prisma/client';

export interface CreateOrderParams {
  amount: string;
  currency: string;
  description?: string;
  userId: string;
}

export interface CaptureOrderParams {
  orderId: string;
}

export interface OrderResponse {
  id: string;
  status: string;
}

export interface IPaymentService {
  /**
   * Идентификатор провайдера.
   */
  get providerName(): PaymentProvider;

  /**
   * Создает новый ордер/транзакцию в платёжной системе.
   */
  createOrder(params: CreateOrderParams): Promise<OrderResponse>;

  /**
   * Подтверждает (захватывает средства) ордера.
   */
  captureOrder(params: CaptureOrderParams): Promise<void>;
}
