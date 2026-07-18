import {
  getDefaultPaymentConnector,
  getPaymentService as getRegisteredPaymentService
} from './connectors/registry.server';

export { getRegisteredPaymentService as getPaymentService };

/**
 * Возвращает валюту активного по умолчанию коннектора.
 */
export const getActivePaymentCurrency = async (): Promise<string> => {
  const { connector, settings } = await getDefaultPaymentConnector();
  return connector.getCheckoutConfig(settings).defaultCurrency;
};
