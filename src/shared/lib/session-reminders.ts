export const DEFAULT_SESSION_REMINDER_MINUTES = 30;
export const MIN_SESSION_REMINDER_MINUTES = 0;
export const MAX_SESSION_REMINDER_MINUTES = 1440;
export const SESSION_REMINDER_PRESET_MINUTES = [0, 5, 10, 15, 30, 60, 120] as const;

type SessionReminderLocale = 'ru' | 'en' | 'sr';

const PUSH_REMINDER_COPY: Record<
  SessionReminderLocale,
  {
    startsNowTitle: string;
    startsSoonTitle: string;
    startsNowBody: string;
    startsSoonBody: string;
  }
> = {
  ru: {
    startsNowTitle: 'Сессия начинается сейчас',
    startsSoonTitle: 'Сессия скоро начнётся',
    startsNowBody: 'Ваша сессия "{title}" начинается прямо сейчас.',
    startsSoonBody: 'Ваша сессия "{title}" начнётся через {minutes} мин.'
  },
  en: {
    startsNowTitle: 'Your session starts now',
    startsSoonTitle: 'Your session starts soon',
    startsNowBody: 'Your session "{title}" starts right now.',
    startsSoonBody: 'Your session "{title}" starts in {minutes} min.'
  },
  sr: {
    startsNowTitle: 'Sesija počinje sada',
    startsSoonTitle: 'Sesija uskoro počinje',
    startsNowBody: 'Vaša sesija "{title}" počinje upravo sada.',
    startsSoonBody: 'Vaša sesija "{title}" počinje za {minutes} min.'
  }
};

/**
 * Нормализует locale пользователя до поддерживаемых вариантов для push.
 * @param locale - исходный locale пользователя.
 * @returns Один из поддерживаемых locale.
 */
export const normalizeReminderLocale = (locale?: string | null): SessionReminderLocale => {
  if (locale === 'en' || locale === 'sr') {
    return locale;
  }
  return 'ru';
};

/**
 * Возвращает итоговое количество минут напоминания для события.
 * Приоритет: override при бронировании -> настройка события.
 * @param event - событие с двумя полями минут напоминания.
 * @returns Количество минут до старта, когда нужно отправить напоминание.
 */
export const getEffectiveReminderMinutes = (event: {
  reminderMinutesBeforeStart: number;
  bookingReminderMinutesBeforeStart: number | null;
}): number => {
  return event.bookingReminderMinutesBeforeStart ?? event.reminderMinutesBeforeStart;
};

/**
 * Вычисляет момент, когда нужно отправить напоминание по событию.
 * @param start - время начала события.
 * @param reminderMinutes - количество минут до старта.
 * @returns Дата и время триггера напоминания.
 */
export const getReminderTriggerAt = (start: Date, reminderMinutes: number): Date => {
  return new Date(start.getTime() - reminderMinutes * 60_000);
};

/**
 * Формирует локализованный текст push-напоминания о сессии.
 * @param params - данные для сообщения.
 * @returns Заголовок и текст push-уведомления.
 */
export const getSessionReminderPushContent = (params: {
  locale?: string | null;
  title: string;
  reminderMinutes: number;
}) => {
  const locale = normalizeReminderLocale(params.locale);
  const copy = PUSH_REMINDER_COPY[locale];
  const isStartsNow = params.reminderMinutes === 0;
  const title = isStartsNow ? copy.startsNowTitle : copy.startsSoonTitle;
  const bodyTemplate = isStartsNow ? copy.startsNowBody : copy.startsSoonBody;
  const body = bodyTemplate
    .replace('{title}', params.title)
    .replace('{minutes}', String(params.reminderMinutes));

  return { title, body };
};
