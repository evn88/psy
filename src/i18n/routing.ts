import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from './config';

/**
 * Конфигурация маршрутизации для next-intl.
 * Используется стратегия с явным locale-префиксом в URL.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});
