import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { routing } from './routing';

/**
 * Конфигурация запроса для next-intl.
 * Читает locale из cookie NEXT_LOCALE или заголовка Accept-Language.
 * Если locale не поддерживается — используется defaultLocale (en).
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  const SUPPORTED_LOCALES = routing.locales as unknown as string[];
  const DEFAULT_LOCALE = routing.defaultLocale;

  // 1. Пытаемся взять локаль из куки
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  // 2. Пытаемся взять из Accept-Language (как в middleware)
  const acceptLang = headersList.get('accept-language') ?? '';
  const preferredLocale = acceptLang
    .split(',')
    .map(l => l.split(';')[0].trim().substring(0, 2).toLowerCase())
    .find(l => SUPPORTED_LOCALES.includes(l));

  const locale =
    cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)
      ? (cookieLocale as (typeof routing.locales)[number])
      : (preferredLocale as (typeof routing.locales)[number]) || DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
