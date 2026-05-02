import { Prisma } from '@prisma/client';

const REDACTED_VALUE = '[REDACTED]';
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 5;

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|passcode|token|secret|apikey|api_key|access_token|refresh_token|client_secret|credential|session/i;

type RedactedJsonValue =
  | string
  | number
  | boolean
  | null
  | RedactedJsonValue[]
  | { [key: string]: RedactedJsonValue };

/**
 * Проверяет, относится ли ключ объекта к чувствительным данным.
 * @param key - Ключ JSON-объекта.
 * @returns `true`, если значение нужно скрыть.
 */
export const isSensitiveLogKey = (key: string): boolean => {
  return SENSITIVE_KEY_PATTERN.test(key);
};

/**
 * Обрезает длинную строку до безопасного размера для журнала.
 * @param value - Исходная строка.
 * @returns Обрезанная строка.
 */
const truncateString = (value: string): string => {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated]`;
};

/**
 * Рекурсивно очищает произвольное значение от секретов и больших payload'ов.
 * @param value - Значение для сохранения в журнал.
 * @param depth - Текущая глубина обхода.
 * @returns JSON-совместимое очищенное значение.
 */
export const redactLogPayload = (value: unknown, depth = 0): RedactedJsonValue => {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (depth >= MAX_DEPTH) {
    return '[Max depth reached]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map(item => redactLogPayload(item, depth + 1));
  }

  const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS);

  return entries.reduce<Record<string, RedactedJsonValue>>((acc, [key, item]) => {
    acc[key] = isSensitiveLogKey(key) ? REDACTED_VALUE : redactLogPayload(item, depth + 1);
    return acc;
  }, {});
};

/**
 * Преобразует значение в безопасный Prisma JSON или `undefined`.
 * @param value - Значение, которое нужно сохранить.
 * @returns Очищенный JSON или `undefined`.
 */
export const toSafeLogJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const redactedValue = redactLogPayload(value);

  if (redactedValue === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  return redactedValue as Prisma.InputJsonValue;
};
