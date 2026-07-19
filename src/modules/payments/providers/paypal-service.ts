import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { applyConfirmedProviderRefund } from '@/modules/payments/financial/financial-service.server';
import type {
  CaptureOrderParams,
  CreateOrderParams,
  IPaymentService,
  OrderResponse,
  RefundPaymentParams
} from '../types';
import {
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalCapture,
  getPayPalOrder,
  refundPayPalCapture
} from '../paypal/client';
import { syncPaymentFromPayPal, syncPaymentWithPayPal } from '../paypal/service';
import { PayPalApiError } from '../paypal/types';
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

  async refundPayment(params: RefundPaymentParams) {
    if (!params.payment.captureId) {
      throw new Error('PayPal payment does not contain capture ID');
    }

    const refund = await refundPayPalCapture({
      captureId: params.payment.captureId,
      amount: params.amount,
      currency: params.payment.currency,
      idempotencyKey: params.idempotencyKey
    });

    if (refund.status === 'COMPLETED' && refund.amount?.value) {
      return applyConfirmedProviderRefund({
        paymentId: params.payment.id,
        refundAmount: new Prisma.Decimal(refund.amount.value),
        provider: PAYPAL_PROVIDER_ID
      });
    }

    return syncPaymentWithPayPal(params.payment);
  }

  async paymentExists(payment: Parameters<IPaymentService['paymentExists']>[0]): Promise<boolean> {
    try {
      await getPayPalOrder(payment.orderId);
      return true;
    } catch (error: unknown) {
      if (!(error instanceof PayPalApiError) || error.status !== 404) {
        throw error;
      }
    }

    if (!payment.captureId) {
      return false;
    }

    try {
      await getPayPalCapture(payment.captureId);
      return true;
    } catch (error: unknown) {
      if (error instanceof PayPalApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
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
