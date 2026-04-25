import 'server-only';

import { randomUUID } from 'node:crypto';
import { auth } from '@/auth';

export interface SystemLogRequestContext {
  initiatorIp: string | null;
  userAgent: string | null;
  requestId: string;
  userId: string | null;
}

const IP_HEADER_NAMES = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'x-client-ip'
] as const;

/**
 * Возвращает первый IP из заголовка `x-forwarded-for`.
 * @param value - Значение заголовка.
 * @returns Первый IP или `null`.
 */
const getForwardedIp = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  return value.split(',')[0]?.trim() || null;
};

/**
 * Извлекает IP инициатора запроса из стандартных proxy-заголовков.
 * @param headers - HTTP-заголовки запроса.
 * @returns IP инициатора или `null`.
 */
export const getInitiatorIp = (headers: Headers): string | null => {
  for (const headerName of IP_HEADER_NAMES) {
    const rawValue = headers.get(headerName);
    const value = headerName === 'x-forwarded-for' ? getForwardedIp(rawValue) : rawValue;

    if (value) {
      return value.trim();
    }
  }

  return null;
};

/**
 * Возвращает request id из заголовков или создаёт новый.
 * @param headers - HTTP-заголовки запроса.
 * @returns Стабильный идентификатор запроса для журнала.
 */
export const getRequestId = (headers: Headers): string => {
  return headers.get('x-request-id') ?? headers.get('x-vercel-id') ?? randomUUID();
};

/**
 * Собирает контекст запроса для системного журнала.
 * @param request - HTTP-запрос.
 * @param userIdOverride - Явно известный userId, если вызывающий код уже определил пользователя.
 * @returns Контекст с IP, user-agent, requestId и userId.
 */
export const getSystemLogRequestContext = async (
  request: Request,
  userIdOverride?: string | null
): Promise<SystemLogRequestContext> => {
  const session = userIdOverride === undefined ? await auth() : null;

  return {
    initiatorIp: getInitiatorIp(request.headers),
    userAgent: request.headers.get('user-agent'),
    requestId: getRequestId(request.headers),
    userId: userIdOverride ?? session?.user?.id ?? null
  };
};
