import { PaymentProvider } from '@prisma/client';
import type { IPaymentService } from './types';
import { PayPalService } from './providers/paypal-service';
import { getPayPalDefaultCurrency } from './paypal/config';

/**
 * Возвращает активного платёжного провайдера, опираясь на переменную среды.
 * По умолчанию использует PAYPAL, если переменная не задана.
 */
export const getActivePaymentProviderConfig = (): PaymentProvider => {
  const provider =
    process.env.ACTIVE_PAYMENT_PROVIDER || process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_PROVIDER;

  switch (provider) {
    case PaymentProvider.PAYPAL:
      return PaymentProvider.PAYPAL;
    default:
      return PaymentProvider.PAYPAL;
  }
};

let activeServiceInstance: IPaymentService | null = null;

/**
 * Фабрика возвращает синглтон-сервис в зависимости от активного провайдера.
 */
export const getPaymentService = (): IPaymentService => {
  if (activeServiceInstance) {
    return activeServiceInstance;
  }

  const activeProvider = getActivePaymentProviderConfig();

  switch (activeProvider) {
    case PaymentProvider.PAYPAL:
      activeServiceInstance = new PayPalService();
      break;
    default:
      // Фолбак на PayPal
      activeServiceInstance = new PayPalService();
      break;
  }

  return activeServiceInstance;
};

/**
 * Вспомогательная функция для получения дефолтной валюты от активного провайдера.
 */
export const getActivePaymentCurrency = (): string => {
  const activeProvider = getActivePaymentProviderConfig();

  switch (activeProvider) {
    case PaymentProvider.PAYPAL:
      return getPayPalDefaultCurrency();
    default:
      return getPayPalDefaultCurrency();
  }
};
