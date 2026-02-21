import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';

/**
 * Конфигурация запроса для next-intl.
 * Читает locale из cookie NEXT_LOCALE, установленного при входе или в настройках.
 * Если locale не поддерживается — используется defaultLocale (en).
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  const locale =
    cookieLocale && (routing.locales as unknown as string[]).includes(cookieLocale)
      ? (cookieLocale as (typeof routing.locales)[number])
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
