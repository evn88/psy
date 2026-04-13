import { Prisma } from '@prisma/client';
import { endOfMonth, startOfMonth } from 'date-fns';

interface PaymentAmountLike {
  amount: Prisma.Decimal | number | string;
  currency: string;
  status: string;
  createdAt: Date;
  capturedAt?: Date | null;
}

interface MonthlyRevenuePoint {
  monthIndex: number;
  monthKey: string;
  monthLabel: string;
  total: number;
}

const MONTH_LABELS_RU = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек'
];

/**
 * Проверяет, относится ли статус к успешно зачисленным платежам.
 */
export const isSuccessfulPaymentStatus = (status: string): boolean => {
  return ['COMPLETED', 'PARTIALLY_REFUNDED'].includes(status);
};

/**
 * Преобразует сумму Prisma.Decimal в number для аналитических расчётов.
 */
export const toPaymentNumber = (amount: Prisma.Decimal | number | string): number => {
  if (amount instanceof Prisma.Decimal) {
    return Number(amount.toString());
  }

  return Number(amount);
};

/**
 * Форматирует денежную сумму с учётом валюты.
 */
export const formatPaymentAmount = (
  amount: Prisma.Decimal | number | string,
  currency: string,
  locale = 'ru-RU'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(toPaymentNumber(amount));
};

/**
 * Возвращает сумму успешных платежей за текущий месяц.
 */
export const getCurrentMonthPaymentsTotal = (
  payments: PaymentAmountLike[],
  now = new Date()
): number => {
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return payments.reduce((total, payment) => {
    const paymentDate = payment.capturedAt ?? payment.createdAt;

    if (
      !isSuccessfulPaymentStatus(payment.status) ||
      paymentDate < monthStart ||
      paymentDate > monthEnd
    ) {
      return total;
    }

    return total + toPaymentNumber(payment.amount);
  }, 0);
};

/**
 * Строит временной ряд по месяцам за выбранный год.
 */
export const getYearlyPaymentsSeries = (
  payments: PaymentAmountLike[],
  year: number
): MonthlyRevenuePoint[] => {
  const monthTotals = new Map<number, number>();

  for (const payment of payments) {
    const paymentDate = payment.capturedAt ?? payment.createdAt;

    if (!isSuccessfulPaymentStatus(payment.status) || paymentDate.getFullYear() !== year) {
      continue;
    }

    const monthIndex = paymentDate.getMonth();
    const currentTotal = monthTotals.get(monthIndex) ?? 0;

    monthTotals.set(monthIndex, currentTotal + toPaymentNumber(payment.amount));
  }

  return MONTH_LABELS_RU.map((label, monthIndex) => ({
    monthIndex,
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    monthLabel: label,
    total: monthTotals.get(monthIndex) ?? 0
  }));
};
