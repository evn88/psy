import 'server-only';

import { NextResponse } from 'next/server';
import { logApiRequest, readResponsePreview } from './system-log-service.server';

const REQUEST_BODY_MAX_BYTES = 16_000;

type ApiRouteContext = Record<string, unknown>;
type ApiRouteHandler<TContext = ApiRouteContext, TRequest extends Request = Request> = (
  request: TRequest,
  context: TContext
) => Response | Promise<Response>;

interface WithApiLoggingOptions {
  resolveUser?: boolean;
}

/**
 * Проверяет, можно ли безопасно читать body запроса для журнала.
 * @param request - HTTP-запрос.
 * @returns `true`, если body похож на небольшой JSON.
 */
const canReadRequestBody = (request: Request): boolean => {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return false;
  }

  const contentLengthHeader = request.headers.get('content-length');

  if (!contentLengthHeader) {
    return false;
  }

  const contentLength = Number(contentLengthHeader);

  return contentLength <= REQUEST_BODY_MAX_BYTES;
};

/**
 * Безопасно читает JSON body запроса без потребления оригинального stream.
 * @param request - HTTP-запрос.
 * @returns JSON body или `undefined`.
 */
const readRequestBodyPreview = async (request: Request): Promise<unknown> => {
  if (!canReadRequestBody(request)) {
    return undefined;
  }

  try {
    return (await request.clone().json()) as unknown;
  } catch {
    return undefined;
  }
};

/**
 * Оборачивает Next.js route handler системным API-логированием.
 * @param handler - Исходный route handler.
 * @returns Route handler с записью запроса, ответа и ошибки в БД.
 */
export const withApiLogging = <TContext = ApiRouteContext, TRequest extends Request = Request>(
  handler: ApiRouteHandler<TContext, TRequest>,
  options: WithApiLoggingOptions = {}
): ApiRouteHandler<TContext, TRequest> => {
  return async (request: TRequest, context: TContext): Promise<Response> => {
    const startedAt = performance.now();
    const requestBody = await readRequestBodyPreview(request);
    const userId = options.resolveUser === false ? null : undefined;

    try {
      const response = await handler(request, context);
      const responseBody = response.status >= 400 ? await readResponsePreview(response) : undefined;

      await logApiRequest({
        request,
        response,
        startedAt,
        userId,
        requestBody,
        responseBody
      });

      return response;
    } catch (error) {
      const response = NextResponse.json({ message: 'Internal server error' }, { status: 500 });

      await logApiRequest({
        request,
        response,
        startedAt,
        userId,
        requestBody,
        responseBody: { message: 'Internal server error' },
        error
      });

      return response;
    }
  };
};
