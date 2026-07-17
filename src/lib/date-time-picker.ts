import { format, isValid, parse } from 'date-fns';

export type TimePickerParts = {
  hour: string;
  minute: string;
  isValid: boolean;
};

/**
 * Преобразует значение формы `yyyy-MM-dd` в локальную календарную дату.
 */
export const parseDatePickerValue = (value: string | null | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : undefined;
};

/**
 * Преобразует выбранную календарную дату в стабильное значение формы.
 */
export const formatDatePickerValue = (date: Date): string => format(date, 'yyyy-MM-dd');

/**
 * Разбирает 24-часовое значение времени и проверяет его диапазон.
 */
export const parseTimePickerValue = (value: string | null | undefined): TimePickerParts => {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  return match
    ? { hour: match[1], minute: match[2], isValid: true }
    : { hour: '', minute: '', isValid: false };
};

/**
 * Обновляет одну часть времени, сохраняя вторую или подставляя `00`.
 */
export const mergeTimePickerValue = (
  value: string | null | undefined,
  next: { hour?: string; minute?: string }
): string => {
  const current = parseTimePickerValue(value);
  const hour = (next.hour ?? current.hour) || '00';
  const minute = (next.minute ?? current.minute) || '00';
  return `${hour}:${minute}`;
};
