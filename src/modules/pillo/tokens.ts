import { createHash, randomBytes } from 'node:crypto';

import { PILLO_ACTION_TOKEN_TTL_HOURS } from './constants';

/**
 * Создаёт случайный одноразовый токен для подтверждения приёма.
 * @returns Токен, который можно безопасно отправить пользователю по ссылке.
 */
export const createPilloActionToken = (): string => {
  return randomBytes(32).toString('base64url');
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
