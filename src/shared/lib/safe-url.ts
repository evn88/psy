import { z } from 'zod';

const HTTPS_PROTOCOL = 'https:';

const DEFAULT_MEETING_HOST_PATTERNS = [
  'meet.google.com',
  'zoom.us',
  '*.zoom.us',
  'teams.microsoft.com',
  '*.teams.microsoft.com',
  '*.webex.com',
  '*.whereby.com',
  'meet.jit.si',
  '*.jitsi.net'
] as const;

const DEFAULT_GOOGLE_CALENDAR_SYNC_HOST_PATTERNS = [
  'calendar.google.com',
  '*.google.com',
  '*.googleusercontent.com'
] as const;

const MEETING_URL_ERROR_MESSAGE =
  'Разрешены только безопасные HTTPS-ссылки на поддерживаемые сервисы видеосвязи';

const GOOGLE_CALENDAR_SYNC_URL_ERROR_MESSAGE =
  'Разрешён только секретный HTTPS iCal-адрес Google Calendar';

type AllowedUrlOptions = {
  allowedHostPatterns: string[];
  validatePathname?: (url: URL) => boolean;
};

/**
 * Возвращает список разрешённых host-шаблонов из env или fallback-значений.
 * Поддерживает точное совпадение и маску формата `*.example.com`.
 * @param envValue - строка env со списком host через запятую.
 * @param fallback - список значений по умолчанию.
 * @returns Нормализованный список host-шаблонов.
 */
const getAllowedHostPatterns = (
  envValue: string | undefined,
  fallback: readonly string[]
): string[] => {
  const configuredPatterns = envValue
    ?.split(',')
    .map(pattern => pattern.trim().toLowerCase())
    .filter(Boolean);

  if (configuredPatterns && configuredPatterns.length > 0) {
    return configuredPatterns;
  }

  return [...fallback];
};

/**
 * Проверяет, что hostname совпадает с разрешённым шаблоном.
 * @param hostname - фактический hostname URL.
 * @param pattern - точный host или маска `*.example.com`.
 * @returns `true`, если host разрешён.
 */
const matchesHostnamePattern = (hostname: string, pattern: string): boolean => {
  if (!pattern.startsWith('*.')) {
    return hostname === pattern;
  }

  const suffix = pattern.slice(2);
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
};

/**
 * Проверяет, что URL использует HTTPS, допустимый host и при необходимости допустимый pathname.
 * @param value - исходная строка URL.
 * @param options - набор ограничений для URL.
 * @returns `true`, если URL проходит все проверки.
 */
const isAllowedUrl = (value: string, options: AllowedUrlOptions): boolean => {
  try {
    const normalizedValue = value.trim();
    const parsedUrl = new URL(normalizedValue);
    const normalizedHostname = parsedUrl.hostname.toLowerCase();

    if (parsedUrl.protocol !== HTTPS_PROTOCOL) {
      return false;
    }

    if (
      !options.allowedHostPatterns.some(pattern =>
        matchesHostnamePattern(normalizedHostname, pattern)
      )
    ) {
      return false;
    }

    if (options.validatePathname && !options.validatePathname(parsedUrl)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Проверяет, что pathname похож на секретный iCal-адрес Google Calendar.
 * @param url - распарсенный URL.
 * @returns `true`, если pathname соответствует iCal-ссылке.
 */
const isGoogleCalendarIcsPath = (url: URL): boolean => {
  const normalizedPathname = url.pathname.toLowerCase();
  return normalizedPathname.endsWith('.ics') || normalizedPathname.includes('/calendar/ical/');
};

/**
 * Возвращает список разрешённых host для meet-ссылок.
 * @returns Список точных host и wildcard-шаблонов.
 */
const getAllowedMeetingHostPatterns = (): string[] => {
  return getAllowedHostPatterns(
    process.env.NEXT_PUBLIC_ALLOWED_MEETING_HOSTS,
    DEFAULT_MEETING_HOST_PATTERNS
  );
};

/**
 * Возвращает список разрешённых host для Google Calendar iCal URL.
 * @returns Список точных host и wildcard-шаблонов.
 */
const getAllowedGoogleCalendarSyncHostPatterns = (): string[] => {
  return getAllowedHostPatterns(
    process.env.NEXT_PUBLIC_ALLOWED_GOOGLE_CALENDAR_SYNC_HOSTS,
    DEFAULT_GOOGLE_CALENDAR_SYNC_HOST_PATTERNS
  );
};

/**
 * Проверяет, что ссылка на встречу соответствует белому списку.
 * @param value - исходная строка URL.
 * @returns `true`, если ссылка безопасна.
 */
export const isAllowedMeetingUrl = (value: string): boolean => {
  return isAllowedUrl(value, {
    allowedHostPatterns: getAllowedMeetingHostPatterns()
  });
};

/**
 * Проверяет, что URL синхронизации Google Calendar соответствует белому списку.
 * @param value - исходная строка URL.
 * @returns `true`, если ссылка безопасна.
 */
export const isAllowedGoogleCalendarSyncUrl = (value: string): boolean => {
  return isAllowedUrl(value, {
    allowedHostPatterns: getAllowedGoogleCalendarSyncHostPatterns(),
    validatePathname: isGoogleCalendarIcsPath
  });
};

/**
 * Нормализует и возвращает безопасную meet-ссылку или `null`.
 * @param value - исходное значение из БД или формы.
 * @returns Валидный HTTPS URL либо `null`.
 */
export const getSafeMeetingUrl = (value: string | null | undefined): string | null => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  if (!isAllowedMeetingUrl(normalizedValue)) {
    return null;
  }

  return new URL(normalizedValue).toString();
};

/**
 * Нормализует и возвращает безопасный URL синхронизации Google Calendar или `null`.
 * @param value - исходное значение из БД или формы.
 * @returns Валидный HTTPS URL либо `null`.
 */
export const getSafeGoogleCalendarSyncUrl = (value: string | null | undefined): string | null => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  if (!isAllowedGoogleCalendarSyncUrl(normalizedValue)) {
    return null;
  }

  return new URL(normalizedValue).toString();
};

/**
 * Создаёт schema для optional URL, где пустая строка и `null` допустимы,
 * а непустое значение обязано пройти кастомную проверку.
 * @param validator - функция проверки URL.
 * @param message - сообщение об ошибке.
 * @returns Zod schema для optional URL.
 */
const createOptionalSafeUrlSchema = (validator: (value: string) => boolean, message: string) => {
  return z
    .union([z.string().trim(), z.null()])
    .optional()
    .refine(value => value == null || value === '' || validator(value), { message });
};

export const optionalMeetingUrlSchema = createOptionalSafeUrlSchema(
  isAllowedMeetingUrl,
  MEETING_URL_ERROR_MESSAGE
);

export const optionalGoogleCalendarSyncUrlSchema = createOptionalSafeUrlSchema(
  isAllowedGoogleCalendarSyncUrl,
  GOOGLE_CALENDAR_SYNC_URL_ERROR_MESSAGE
);
