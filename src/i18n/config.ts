/**
 * Поддерживаемые локали приложения.
 */
export const locales = ['ru', 'en', 'sr'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'ru';

/**
 * Проверяет, что значение является поддерживаемой локалью приложения.
 * @param value - произвольное значение локали.
 * @returns true, если локаль поддерживается приложением.
 */
export const isLocale = (value: string): value is AppLocale => {
  return locales.includes(value as AppLocale);
};
