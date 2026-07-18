import { randomUUID } from 'node:crypto';
import type {
  CaptureOrderParams,
  CreateOrderParams,
  IPaymentService,
  OrderResponse
} from '../types';
import { capturePayPalOrder, createPayPalOrder } from '../paypal/client';
import { syncPaymentFromPayPal, syncPaymentWithPayPal } from '../paypal/service';
import { PAYPAL_PROVIDER_ID } from '../types';
import { PAYPAL_SUPPORTED_CURRENCIES } from '../connectors/paypal/constants';

export class PayPalService implements IPaymentService {
  get providerName(): string {
    return PAYPAL_PROVIDER_ID;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const paymentId = randomUUID();

    // Создаем ордер в PayPal
    const order = await createPayPalOrder({
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      invoiceId: paymentId,
      customId: params.userId
    });

    // Сохраняем начальный статус в БД
    await syncPaymentFromPayPal({
      order,
      userId: params.userId,
      paymentId,
      kind: params.kind,
      servicePackageId: params.servicePackageId
    });

    return {
      checkoutKind: 'paypal',
      id: order.id,
      status: order.status
    };
  }

  async captureOrder(params: CaptureOrderParams): Promise<void> {
    const order = await capturePayPalOrder(params.orderId);

    await syncPaymentFromPayPal({ order });
  }

  supportsCurrency(currency: string): boolean {
    return PAYPAL_SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
  }

  async syncPayment(
    payment: Parameters<IPaymentService['syncPayment']>[0]
  ): ReturnType<IPaymentService['syncPayment']> {
    return syncPaymentWithPayPal(payment);
  }
}
