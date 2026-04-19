import { PaymentProvider } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  CaptureOrderParams,
  CreateOrderParams,
  IPaymentService,
  OrderResponse
} from '../types';
import { capturePayPalOrder, createPayPalOrder } from '../../paypal/client';
import { syncPaymentFromPayPal } from '../../paypal/service';

export class PayPalService implements IPaymentService {
  get providerName(): PaymentProvider {
    return PaymentProvider.PAYPAL;
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
      id: order.id,
      status: order.status
    };
  }

  async captureOrder(params: CaptureOrderParams): Promise<void> {
    // В случае с PayPal достаточно вызвать метод capture (который мы уже имеем)
    // Вебхук сам обновит статус в БД, или можно сделать это сразу здесь,
    // но в оригинальном route: `await fetch('/api/paypal/orders/${orderId}/capture')`
    // логика была просто вызов capture.
    await capturePayPalOrder(params.orderId);
  }
}
