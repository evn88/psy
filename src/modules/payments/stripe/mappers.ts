import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';

import { STRIPE_SUPPORTED_CURRENCIES } from '@/modules/payments/connectors/stripe/constants';

const MINOR_UNIT_FACTOR = 100;

/**
 * Преобразует сумму из основной денежной единицы в минимальную единицу Stripe.
 */
export const toStripeMinorUnits = (amount: string, currency: string): number => {
  const normalizedCurrency = currency.toUpperCase();

  if (!STRIPE_SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
    throw new Error(`Stripe currency ${normalizedCurrency} is not supported`);
  }

  const minorUnits = new Prisma.Decimal(amount).mul(MINOR_UNIT_FACTOR);

  if (!minorUnits.isInteger() || minorUnits.lessThanOrEqualTo(0)) {
    throw new Error('Stripe amount must be positive and have no more than two decimal places');
  }

  const value = minorUnits.toNumber();

  if (!Number.isSafeInteger(value)) {
    throw new Error('Stripe amount exceeds the safe integer range');
  }

  return value;
};

/**
 * Преобразует минимальные денежные единицы Stripe в Decimal приложения.
 */
export const fromStripeMinorUnits = (amount: number): Prisma.Decimal => {
  return new Prisma.Decimal(amount).div(MINOR_UNIT_FACTOR);
};

/**
 * Нормализует жизненный цикл PaymentIntent в статусы приложения.
 */
export const getStripePaymentStatus = (status: Stripe.PaymentIntent.Status): string => {
  switch (status) {
    case 'requires_payment_method':
      return 'CREATED';
    case 'requires_confirmation':
      return 'SAVED';
    case 'requires_action':
      return 'PAYER_ACTION_REQUIRED';
    case 'processing':
      return 'PENDING';
    case 'requires_capture':
      return 'APPROVED';
    case 'succeeded':
      return 'COMPLETED';
    case 'canceled':
      return 'CANCELLED';
  }
};
