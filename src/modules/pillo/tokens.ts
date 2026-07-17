import { createHash, createHmac, randomBytes } from 'node:crypto';

import { PILLO_ACTION_TOKEN_TTL_HOURS } from './constants';

/**
 * Создаёт случайный одноразовый токен для подтверждения приёма.
 * @returns Токен, который можно безопасно отправить пользователю по ссылке.
 */
export const createPilloActionToken = (): string => {
  return randomBytes(32).toString('base64url');
};

/**
 * Создаёт стабильный и непредсказуемый токен напоминания для одного приёма.
 * Стабильность нужна, чтобы повтор шага отправки использовал тот же idempotency payload.
 * @param intakeId - идентификатор приёма.
 * @returns HMAC-токен для одноразовой ссылки.
 */
export const createPilloReminderActionToken = (intakeId: string): string => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required for Pillo reminder action tokens');
  }

  return createHmac('sha256', secret)
    .update(`pillo-intake-reminder:v1:${intakeId}`)
    .digest('base64url');
};

/**
 * Хеширует токен перед сохранением в БД.
 * @param token - исходный токен из ссылки.
 * @returns SHA-256 хеш токена.
 */
export const hashPilloActionToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

/**
 * Возвращает дату истечения одноразовой ссылки.
 * @param now - текущий момент времени.
 * @returns Дата истечения через 48 часов.
 */
export const getPilloActionTokenExpiresAt = (now = new Date()): Date => {
  return new Date(now.getTime() + PILLO_ACTION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
};
