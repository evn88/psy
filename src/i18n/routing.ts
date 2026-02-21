import { defineRouting } from 'next-intl/routing';

/**
 * Конфигурация маршрутизации для next-intl.
 * Используется стратегия без префиксов в URL (cookie-based).
 * Поддерживаемые языки: English (по умолчанию) и Русский.
 */
export const routing = defineRouting({
  locales: ['en', 'ru'],
  defaultLocale: 'en',
  localeDetection: false
});
