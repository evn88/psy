import 'server-only';

import { Prisma, SystemLogCategory, SystemLogLevel } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import { getSystemLogRequestContext } from './request-context.server';
import { toSafeLogJson } from './redact-log-payload';
import { getSystemLogSettings } from './system-log-settings.server';

const API_RESPONSE_BODY_MAX_LENGTH = 8_000;

interface ErrorSnapshot {
  errorName: string;
  errorMessage: string;
  errorStack?: string;
  errorDetails?: Prisma.InputJsonValue;
}

export interface WriteSystemLogEntryParams {
  category: SystemLogCategory;
  level: SystemLogLevel;
  source: string;
  operation?: string;
  service?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  initiatorIp?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  userId?: string | null;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: unknown;
  errorDetails?: unknown;
}

export interface LogApiRequestParams {
  request: Request;
  response: Response;
  startedAt: number;
  userId?: string | null;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: unknown;
}

export interface LogExternalServiceErrorParams {
  category: Exclude<SystemLogCategory, 'API'>;
  service: string;
  operation: string;
  request?: Request;
  userId?: string | null;
  error: unknown;
  metadata?: unknown;
  statusCode?: number;
  path?: string;
  method?: string;
}

/**
 * Снимок ошибки в формате, безопасном для хранения в БД.
 * @param error - Исходная ошибка.
 * @param details - Дополнительный контекст ошибки.
 * @returns Нормализованные поля ошибки.
 */
const createErrorSnapshot = (error: unknown, details?: unknown): ErrorSnapshot => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorDetails: toSafeLogJson(details)
    };
  }

  return {
    errorName: 'UnknownError',
    errorMessage: typeof error === 'string' ? error : 'Unknown error',
    errorDetails: toSafeLogJson(details ?? error)
  };
};

/**
 * Определяет, включено ли логирование для категории.
 * @param category - Категория системного журнала.
 * @returns `true`, если запись нужно сохранить.
 */
const isCategoryEnabled = async (category: SystemLogCategory): Promise<boolean> => {
  const settings = await getSystemLogSettings();

  if (category === SystemLogCategory.API) {
    return settings.apiRequestsEnabled;
  }

  if (category === SystemLogCategory.AI) {
    return settings.aiErrorsEnabled;
  }

  return settings.paymentErrorsEnabled;
};

/**
 * Безопасно пишет запись системного журнала в БД.
 * Ошибка записи не пробрасывается в основной пользовательский сценарий.
 * @param params - Данные записи журнала.
 */
export const writeSystemLogEntry = async (params: WriteSystemLogEntryParams): Promise<void> => {
  try {
    if (!(await isCategoryEnabled(params.category))) {
      return;
    }

    const errorSnapshot = params.error
      ? createErrorSnapshot(params.error, params.errorDetails)
      : {
          errorName: undefined,
          errorMessage: undefined,
          errorStack: undefined,
          errorDetails: toSafeLogJson(params.errorDetails)
        };

    await prisma.systemLogEntry.create({
      data: {
        category: params.category,
        level: params.level,
        source: params.source,
        operation: params.operation,
        service: params.service,
        method: params.method,
        path: params.path,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        initiatorIp: params.initiatorIp ?? null,
        userAgent: params.userAgent ?? null,
        requestId: params.requestId ?? null,
        userId: params.userId ?? null,
        requestBody: toSafeLogJson(params.requestBody),
        responseBody: toSafeLogJson(params.responseBody),
        errorName: errorSnapshot.errorName,
        errorMessage: errorSnapshot.errorMessage,
        errorStack: errorSnapshot.errorStack,
        errorDetails: errorSnapshot.errorDetails
      }
    });
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        scope: 'system-logs',
        message: 'Не удалось сохранить запись системного журнала.',
        error: error instanceof Error ? error.message : String(error)
      })}\n`
    );
  }
};

/**
 * Пишет запись об API-запросе.
 * @param params - Данные API-запроса и ответа.
 */
export const logApiRequest = async (params: LogApiRequestParams): Promise<void> => {
  const context = await getSystemLogRequestContext(params.request, params.userId);
  const url = new URL(params.request.url);
  const statusCode = params.response.status;
  const level =
    params.error || statusCode >= 500
      ? SystemLogLevel.ERROR
      : statusCode >= 400
        ? SystemLogLevel.WARN
        : SystemLogLevel.INFO;

  await writeSystemLogEntry({
    category: SystemLogCategory.API,
    level,
    source: 'next-route-handler',
    operation: `${params.request.method} ${url.pathname}`,
    method: params.request.method,
    path: url.pathname,
    statusCode,
    durationMs: Math.max(0, Math.round(performance.now() - params.startedAt)),
    initiatorIp: context.initiatorIp,
    userAgent: context.userAgent,
    requestId: context.requestId,
    userId: context.userId,
    requestBody: params.requestBody,
    responseBody: params.responseBody,
    error: params.error
  });
};

/**
 * Пишет ошибку внешнего сервиса: AI, PayPal или будущей интеграции.
 * @param params - Данные ошибки внешнего сервиса.
 */
export const logExternalServiceError = async (
  params: LogExternalServiceErrorParams
): Promise<void> => {
  const context = params.request
    ? await getSystemLogRequestContext(params.request, params.userId)
    : {
        initiatorIp: null,
        userAgent: null,
        requestId: null,
        userId: params.userId ?? null
      };

  await writeSystemLogEntry({
    category: params.category,
    level: SystemLogLevel.ERROR,
    source: 'external-service',
    operation: params.operation,
    service: params.service,
    method: params.method,
    path: params.path,
    statusCode: params.statusCode,
    initiatorIp: context.initiatorIp,
    userAgent: context.userAgent,
    requestId: context.requestId,
    userId: context.userId,
    error: params.error,
    errorDetails: params.metadata
  });
};

/**
 * Создаёт объект сервиса для мест, где удобнее внедрять зависимости явно.
 * @returns Переиспользуемый сервис системного журнала.
 */
export const createSystemLogService = () => {
  return {
    writeSystemLogEntry,
    logApiRequest,
    logExternalServiceError
  };
};

/**
 * Безопасно читает JSON-ответ для API-журнала.
 * @param response - HTTP-ответ route handler'а.
 * @returns JSON или текстовый fallback.
 */
export const readResponsePreview = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return undefined;
  }

  const text = await response.clone().text();

  if (!text) {
    return undefined;
  }

  const normalizedText =
    text.length > API_RESPONSE_BODY_MAX_LENGTH
      ? `${text.slice(0, API_RESPONSE_BODY_MAX_LENGTH)}... [truncated]`
      : text;

  try {
    return JSON.parse(normalizedText) as unknown;
  } catch {
    return normalizedText;
  }
};
