import { randomUUID } from 'node:crypto';
import { SystemLogCategory } from '@prisma/client';
import {
  getPayPalBaseUrl,
  getPayPalClientId,
  getPayPalClientSecret,
  getPayPalWebhookId
} from './config';
import { logExternalServiceError } from '@/modules/system-logs/system-log-service.server';
import {
  type PayPalCapture,
  PayPalApiError,
  type PayPalOrder,
  type PayPalWebhookEvent,
  type PayPalWebhookVerificationResponse
} from './types';

type PayPalRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown>;
};

type PayPalAccessTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let payPalAccessTokenCache: PayPalAccessTokenCache | null = null;

/**
 * Безопасно читает JSON-ответ PayPal API.
 * Если тело отсутствует или не является JSON, возвращает `null`.
 */
const readJsonResponse = async <T>(response: Response): Promise<T | null> => {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return (await response.json()) as T;
};

/**
 * Возвращает Bearer token для серверных вызовов PayPal API.
 * Токен кешируется в памяти процесса с безопасным запасом по времени.
 */
export const getPayPalAccessToken = async (): Promise<string> => {
  const now = Date.now();

  if (payPalAccessTokenCache && payPalAccessTokenCache.expiresAt > now) {
    return payPalAccessTokenCache.accessToken;
  }

  const credentials = Buffer.from(
    `${getPayPalClientId()}:${getPayPalClientSecret()}`,
    'utf8'
  ).toString('base64');

  let response: Response;

  try {
    response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store'
    });
  } catch (error) {
    await logExternalServiceError({
      category: SystemLogCategory.PAYMENT,
      service: 'paypal',
      operation: 'get-access-token',
      method: 'POST',
      path: '/v1/oauth2/token',
      error
    });

    throw error;
  }

  const payload = await readJsonResponse<{
    access_token?: string;
    expires_in?: number;
  }>(response);

  if (!response.ok || !payload?.access_token) {
    const error = new PayPalApiError('Failed to get PayPal access token', response.status, payload);

    await logExternalServiceError({
      category: SystemLogCategory.PAYMENT,
      service: 'paypal',
      operation: 'get-access-token',
      method: 'POST',
      path: '/v1/oauth2/token',
      statusCode: response.status,
      error,
      metadata: payload
    });

    throw error;
  }

  payPalAccessTokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + Math.max((payload.expires_in ?? 0) - 60, 60) * 1000
  };

  return payload.access_token;
};

/**
 * Выполняет авторизованный запрос к PayPal REST API.
 */
export const paypalRequest = async <T>(path: string, init: PayPalRequestInit = {}): Promise<T> => {
  const accessToken = await getPayPalAccessToken();
  const url = `${getPayPalBaseUrl()}${path}`;
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${accessToken}`);

  let body: BodyInit | undefined;

  if (
    init.body instanceof FormData ||
    typeof init.body === 'string' ||
    init.body instanceof URLSearchParams
  ) {
    body = init.body;
  } else if (init.body) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers,
      body,
      cache: 'no-store'
    });
  } catch (error) {
    await logExternalServiceError({
      category: SystemLogCategory.PAYMENT,
      service: 'paypal',
      operation: `paypal-request:${path}`,
      method: init.method,
      path,
      error,
      metadata: init.body
    });

    throw error;
  }

  const payload = await readJsonResponse<T>(response);

  if (!response.ok) {
    const error = new PayPalApiError(`PayPal request failed: ${path}`, response.status, payload);

    await logExternalServiceError({
      category: SystemLogCategory.PAYMENT,
      service: 'paypal',
      operation: `paypal-request:${path}`,
      method: init.method,
      path,
      statusCode: response.status,
      error,
      metadata: {
        requestBody: init.body,
        responseBody: payload
      }
    });

    throw error;
  }

  return payload as T;
};

/**
 * Создаёт order в PayPal Orders API.
 */
export const createPayPalOrder = async (params: {
  amount: string;
  currency: string;
  description?: string;
  invoiceId: string;
  customId: string;
}): Promise<PayPalOrder> => {
  return paypalRequest<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
      'PayPal-Request-Id': `create-order-${params.invoiceId}`
    },
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: params.currency,
            value: params.amount
          },
          custom_id: params.customId,
          invoice_id: params.invoiceId,
          description: params.description
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING'
          }
        }
      }
    }
  });
};

/**
 * Получает актуальное состояние заказа PayPal по order id.
 */
export const getPayPalOrder = async (orderId: string): Promise<PayPalOrder> => {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}`, {
    method: 'GET'
  });
};

/**
 * Выполняет capture для заказа PayPal.
 */
export const capturePayPalOrder = async (orderId: string): Promise<PayPalOrder> => {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
      'PayPal-Request-Id': `capture-order-${orderId}-${randomUUID()}`
    },
    body: {}
  });
};

/**
 * Получает подробности конкретного capture из Payments API.
 */
export const getPayPalCapture = async (captureId: string): Promise<PayPalCapture> => {
  return paypalRequest<PayPalCapture>(`/v2/payments/captures/${captureId}`, {
    method: 'GET'
  });
};

/**
 * Проверяет подпись входящего PayPal webhook через Verify Webhook Signature API.
 */
export const verifyPayPalWebhookSignature = async (params: {
  headers: Headers;
  event: PayPalWebhookEvent;
}): Promise<boolean> => {
  const transmissionId = params.headers.get('PAYPAL-TRANSMISSION-ID');
  const transmissionTime = params.headers.get('PAYPAL-TRANSMISSION-TIME');
  const transmissionSig = params.headers.get('PAYPAL-TRANSMISSION-SIG');
  const certUrl = params.headers.get('PAYPAL-CERT-URL');
  const authAlgo = params.headers.get('PAYPAL-AUTH-ALGO');

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return false;
  }

  const verification = await paypalRequest<PayPalWebhookVerificationResponse>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: getPayPalWebhookId(),
        webhook_event: params.event
      }
    }
  );

  return verification.verification_status === 'SUCCESS';
};
