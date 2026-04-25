import prisma from '@/shared/lib/prisma';
import { defaultLocale, isLocale } from '@/i18n/config';
import { NextResponse } from 'next/server';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

/**
 * Возвращает базовый URL приложения.
 * @param request - исходный HTTP-запрос.
 * @returns Абсолютный origin приложения.
 */
const getBaseUrl = (request: Request): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return new URL(request.url).origin;
};

/**
 * Нормализует locale из query/form значения.
 * @param value - произвольное значение locale.
 * @returns Поддерживаемая locale приложения.
 */
const resolveLocale = (value: string | null): string => {
  return value && isLocale(value) ? value : defaultLocale;
};

/**
 * Строит локализованный redirect на страницу блога.
 * @param baseUrl - базовый URL приложения.
 * @param locale - locale редиректа.
 * @param query - query-параметры результата.
 * @returns Redirect response.
 */
const blogRedirect = (baseUrl: string, locale: string, query: string): NextResponse => {
  return NextResponse.redirect(`${baseUrl}/${locale}/blog?${query}`);
};

/**
 * Строит локализованный redirect на страницу подтверждения отписки.
 * @param baseUrl - базовый URL приложения.
 * @param locale - locale редиректа.
 * @param token - токен подписки.
 * @returns Redirect response.
 */
const unsubscribeConfirmRedirect = (
  baseUrl: string,
  locale: string,
  token: string
): NextResponse => {
  return NextResponse.redirect(
    `${baseUrl}/${locale}/blog/unsubscribe?token=${encodeURIComponent(token)}`
  );
};

/**
 * GET /api/blog/unsubscribe
 * Не меняет состояние, а только переводит пользователя на confirm-страницу.
 */
async function getHandler(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const locale = resolveLocale(searchParams.get('locale'));
  const baseUrl = getBaseUrl(req);

  if (!token) {
    return blogRedirect(baseUrl, locale, 'unsubscribed=not_found');
  }

  const subscription = await prisma.blogSubscription.findFirst({
    where: { token }
  });

  if (!subscription) {
    return blogRedirect(baseUrl, locale, 'unsubscribed=not_found');
  }

  return unsubscribeConfirmRedirect(baseUrl, locale, token);
}

/**
 * POST /api/blog/unsubscribe
 * Подтверждает отписку от уведомлений блога по токену из формы.
 */
async function postHandler(req: Request) {
  const formData = await req.formData();
  const tokenValue = formData.get('token');
  const localeValue = formData.get('locale');
  const baseUrl = getBaseUrl(req);
  const locale = resolveLocale(typeof localeValue === 'string' ? localeValue : null);

  if (typeof tokenValue !== 'string' || !tokenValue.trim()) {
    return blogRedirect(baseUrl, locale, 'unsubscribed=not_found');
  }

  const subscription = await prisma.blogSubscription.findFirst({
    where: { token: tokenValue.trim() }
  });

  if (!subscription) {
    return blogRedirect(baseUrl, locale, 'unsubscribed=not_found');
  }

  await prisma.blogSubscription.delete({
    where: { id: subscription.id }
  });

  return blogRedirect(baseUrl, locale, 'unsubscribed=true');
}

export const GET = withApiLogging(getHandler);
export const POST = withApiLogging(postHandler);
