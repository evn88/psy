import { isValidTimeZone } from '@/lib/timezone';

/**
 * Нормализует значение часового пояса, полученное из браузерного API.
 * @param value - произвольное значение из `Intl`.
 * @returns Валидный IANA-идентификатор или `null`.
 */
export const normalizeBrowserTimeZone = (value: unknown): string | null => {
  return typeof value === 'string' && isValidTimeZone(value) ? value : null;
};

/**
 * Определяет IANA-идентификатор часового пояса из настроек браузера.
 * @returns Валидный часовой пояс или `null`, если браузер не предоставил данные.
 */
export const detectBrowserTimeZone = (): string | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeBrowserTimeZone(timezone);
  } catch {
    return null;
  }
};
