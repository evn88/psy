import { getTimezoneOffset } from 'date-fns-tz';

/**
 * Проверяет корректность IANA timezone через Intl API.
 * @param value - произвольный идентификатор timezone.
 * @returns `true`, если timezone поддерживается средой выполнения.
 */
export const isValidTimeZone = (value: string): boolean => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalizedValue }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

/**
 * Форматирует смещение IANA-часового пояса относительно UTC для указанной даты.
 * @param timeZone - IANA-идентификатор часового пояса.
 * @param date - дата, для которой учитывается переход на летнее или зимнее время.
 * @returns Компактная подпись смещения, например `UTC+2` или `UTC-03:30`.
 */
export const formatUtcOffset = (
  timeZone: string | null | undefined,
  date: Date = new Date()
): string => {
  if (!timeZone || !isValidTimeZone(timeZone)) {
    return 'UTC+0';
  }

  const referenceDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const offsetMinutes = getTimezoneOffset(timeZone, referenceDate) / (60 * 1000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffsetMinutes / 60);
  const minutes = absoluteOffsetMinutes % 60;

  return `UTC${sign}${hours}${minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`}`;
};
