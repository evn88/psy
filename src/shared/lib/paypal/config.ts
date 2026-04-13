const PAYPAL_ENVIRONMENTS = ['sandbox', 'live'] as const;

type PayPalEnvironment = (typeof PAYPAL_ENVIRONMENTS)[number];

/**
 * Возвращает режим работы PayPal API.
 * По умолчанию используется sandbox.
 */
export const getPayPalEnvironment = (): PayPalEnvironment => {
  const rawValue = process.env.PAYPAL_ENVIRONMENT?.toLowerCase();

  if (rawValue && PAYPAL_ENVIRONMENTS.includes(rawValue as PayPalEnvironment)) {
    return rawValue as PayPalEnvironment;
  }

  return 'sandbox';
};

/**
 * Возвращает client id для PayPal JavaScript SDK и серверных запросов.
 */
export const getPayPalClientId = (): string => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not configured');
  }

  return clientId;
};

/**
 * Возвращает client secret для серверных PayPal API вызовов.
 */
export const getPayPalClientSecret = (): string => {
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientSecret) {
    throw new Error('PAYPAL_CLIENT_SECRET is not configured');
  }

  return clientSecret;
};

/**
 * Возвращает webhook id, необходимый для проверки подписи входящих событий.
 */
export const getPayPalWebhookId = (): string => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!webhookId) {
    throw new Error('PAYPAL_WEBHOOK_ID is not configured');
  }

  return webhookId;
};

/**
 * Возвращает базовый URL PayPal API для выбранного окружения.
 */
export const getPayPalBaseUrl = (): string => {
  return getPayPalEnvironment() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

/**
 * Возвращает валюту по умолчанию для checkout-формы.
 */
export const getPayPalDefaultCurrency = (): string => {
  return process.env.NEXT_PUBLIC_PAYPAL_CURRENCY?.trim().toUpperCase() || 'EUR';
};
