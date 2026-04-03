import { getRequestConfig } from 'next-intl/server';
import { isLocale } from './config';
import { routing } from './routing';

/**
 * Конфигурация запроса для next-intl.
 * Получает locale из сегмента `[locale]`, который нормализуется в `proxy.ts`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale =
    requestedLocale && isLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
