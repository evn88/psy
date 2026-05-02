import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';

import emailEn from '../../messages/email-en.json';
import emailRu from '../../messages/email-ru.json';
import emailSr from '../../messages/email-sr.json';
import messagesEn from '../../messages/en.json';
import messagesRu from '../../messages/ru.json';
import messagesSr from '../../messages/sr.json';

const EMAIL_TRANSLATIONS: Record<AppLocale, typeof emailEn> = {
  ru: emailRu,
  en: emailEn,
  sr: emailSr
};

const DATE_TIME_LOCALE_TAGS: Record<AppLocale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  sr: 'sr-Latn-RS'
};

type EventTypeLabels = typeof messagesEn.Schedule.types;

type AdminEventBookingTranslations = typeof messagesEn.AdminEventBooking;

type AdminEventCancellationTranslations = typeof messagesEn.AdminEventCancellation;

const EVENT_TYPE_LABELS: Record<AppLocale, EventTypeLabels> = {
  ru: messagesRu.Schedule.types,
  en: messagesEn.Schedule.types,
  sr: messagesSr.Schedule.types
};

const ADMIN_EVENT_BOOKING_TRANSLATIONS: Record<AppLocale, AdminEventBookingTranslations> = {
  ru: messagesRu.AdminEventBooking,
  en: messagesEn.AdminEventBooking,
  sr: messagesSr.AdminEventBooking
};

const ADMIN_EVENT_CANCELLATION_TRANSLATIONS: Record<AppLocale, AdminEventCancellationTranslations> =
  {
    ru: messagesRu.AdminEventCancellation,
    en: messagesEn.AdminEventCancellation,
    sr: messagesSr.AdminEventCancellation
  };

/**
 * Нормализует произвольную locale до одной из поддерживаемых локалей приложения.
 * @param locale - исходная locale пользователя.
 * @returns Поддерживаемая locale приложения.
 */
export const normalizeEmailLocale = (locale?: string | null): AppLocale => {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (!normalizedLocale) {
    return defaultLocale;
  }

  const baseLocale = normalizedLocale.split('-')[0];

  if (isLocale(baseLocale)) {
    return baseLocale;
  }

  return defaultLocale;
};

/**
 * Возвращает email-переводы для указанной локали.
 * @param locale - locale пользователя.
 * @returns Набор переводов для email-шаблонов.
 */
export const getEmailTranslations = (locale?: string | null): typeof emailEn => {
  return EMAIL_TRANSLATIONS[normalizeEmailLocale(locale)];
};

/**
 * Возвращает переводы для письма администратору о новой записи.
 * @param locale - locale пользователя.
 * @returns Локализованный словарь письма.
 */
export const getAdminEventBookingTranslations = (
  locale?: string | null
): AdminEventBookingTranslations => {
  return ADMIN_EVENT_BOOKING_TRANSLATIONS[normalizeEmailLocale(locale)];
};

/**
 * Возвращает переводы для письма администратору об отмене записи.
 * @param locale - locale пользователя.
 * @returns Локализованный словарь письма.
 */
export const getAdminEventCancellationTranslations = (
  locale?: string | null
): AdminEventCancellationTranslations => {
  return ADMIN_EVENT_CANCELLATION_TRANSLATIONS[normalizeEmailLocale(locale)];
};

/**
 * Проверяет и нормализует timezone для безопасного форматирования даты и времени.
 * @param timezone - исходный идентификатор часового пояса.
 * @returns Валидный идентификатор часового пояса.
 */
const resolveEmailTimeZone = (timezone?: string | null): string => {
  const candidateTimeZone = timezone?.trim() || 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidateTimeZone }).format(new Date());
    return candidateTimeZone;
  } catch {
    return 'UTC';
  }
};

/**
 * Возвращает локализованное название типа события.
 * @param eventType - системный тип события.
 * @param locale - locale пользователя.
 * @returns Локализованное название типа или исходное значение, если перевод не найден.
 */
export const getLocalizedEventTypeLabel = (eventType: string, locale?: string | null): string => {
  const eventTypeLabels = EVENT_TYPE_LABELS[normalizeEmailLocale(locale)];

  return eventTypeLabels[eventType as keyof EventTypeLabels] ?? eventType;
};

/**
 * Возвращает отображаемый заголовок события для email.
 * Если пользовательский title отсутствует, используется локализованное название типа.
 * @param title - пользовательский заголовок события.
 * @param eventType - системный тип события.
 * @param locale - locale пользователя.
 * @returns Локализованный заголовок события.
 */
export const getLocalizedEventTitle = (
  title: string | null | undefined,
  eventType: string,
  locale?: string | null
): string => {
  const normalizedTitle = title?.trim();

  if (normalizedTitle) {
    return normalizedTitle;
  }

  return getLocalizedEventTypeLabel(eventType, locale);
};

interface FormatEmailEventDateTimeParams {
  start: Date | string;
  end: Date | string;
  locale?: string | null;
  timeZone?: string | null;
}

/**
 * Форматирует дату и диапазон времени события для email с учётом локали и timezone.
 * @param params - дата начала, дата окончания, locale и timezone пользователя.
 * @returns Готовые строки даты, времени и итоговый timezone.
 */
export const formatEmailEventDateTime = ({
  start,
  end,
  locale,
  timeZone
}: FormatEmailEventDateTimeParams): {
  dateText: string;
  timeText: string;
  timeZone: string;
} => {
  const normalizedLocale = normalizeEmailLocale(locale);
  const localeTag = DATE_TIME_LOCALE_TAGS[normalizedLocale];
  const resolvedTimeZone = resolveEmailTimeZone(timeZone);
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateFormatter = new Intl.DateTimeFormat(localeTag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: resolvedTimeZone
  });
  const timeFormatter = new Intl.DateTimeFormat(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: resolvedTimeZone
  });

  return {
    dateText: dateFormatter.format(startDate),
    timeText: `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)} (${resolvedTimeZone})`,
    timeZone: resolvedTimeZone
  };
};
