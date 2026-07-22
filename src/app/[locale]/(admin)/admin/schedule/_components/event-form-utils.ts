import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { CONSULTATION_RATE_DURATION_MINUTES } from '@/modules/payments/financial/constants';

export type EventTemporalValues = {
  date: string;
  startTime: string;
  duration: number;
};

/**
 * Представляет сохранённый интервал как локальные поля формы в указанном часовом поясе.
 * @param start - начало события в абсолютном времени.
 * @param end - окончание события в абсолютном времени.
 * @param timeZone - IANA timezone клиента.
 * @returns Дата, локальное время начала и длительность в минутах.
 */
export const getEventTemporalValues = (
  start: Date,
  end: Date,
  timeZone: string
): EventTemporalValues => {
  const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000));

  return {
    date: formatInTimeZone(start, timeZone, 'yyyy-MM-dd'),
    startTime: formatInTimeZone(start, timeZone, 'HH:mm'),
    duration
  };
};

/**
 * Преобразует локальные поля формы клиента в абсолютный UTC-интервал.
 * @param values - дата, время, длительность и timezone клиента.
 * @returns Начало и окончание события как объекты Date.
 */
export const getEventDateRange = (values: EventTemporalValues & { timeZone: string }) => {
  const start = fromZonedTime(`${values.date}T${values.startTime}:00`, values.timeZone);

  if (
    formatInTimeZone(start, values.timeZone, 'yyyy-MM-dd HH:mm') !==
    `${values.date} ${values.startTime}`
  ) {
    throw new Error('Указанное локальное время не существует из-за перехода часового пояса');
  }

  return {
    start,
    end: addMinutes(start, values.duration)
  };
};

/**
 * Вычисляет отображаемую стоимость консультации по длительности встречи.
 * Тариф задаётся за 60 минут и на клиенте используется только как предварительный расчёт.
 * @param hourlyRate - строковое значение тарифа в EUR за 60 минут.
 * @param durationMinutes - длительность консультации в минутах.
 * @returns Сумма в EUR с двумя десятичными знаками или `null` для некорректных данных.
 */
export const calculateConsultationChargePreview = (
  hourlyRate: string,
  durationMinutes: number
): string | null => {
  const rate = Number(hourlyRate);

  if (
    !Number.isFinite(rate) ||
    rate < 0 ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return null;
  }

  const rateInCents = Math.round(rate * 100);
  const chargeInCents = Math.round(
    (rateInCents * durationMinutes) / CONSULTATION_RATE_DURATION_MINUTES
  );

  if (!Number.isSafeInteger(rateInCents) || !Number.isSafeInteger(chargeInCents)) {
    return null;
  }

  return (chargeInCents / 100).toFixed(2);
};
