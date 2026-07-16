import crypto from 'crypto';
import { z } from 'zod';

export const consentSignatureKeyId = 'consent-hmac-v1';

const consentSignaturePayloadSchema = z.object({
  schemaVersion: z.literal(1),
  consentType: z.string().min(1),
  userId: z.string().min(1),
  agreedAt: z.string().datetime(),
  ip: z.string().min(1),
  userAgent: z.string().min(1),
  form: z.object({
    locale: z.string().min(1),
    version: z.number().int().positive(),
    snapshotHash: z.string().regex(/^[a-f0-9]{64}$/)
  }),
  answersHash: z.string().regex(/^[a-f0-9]{64}$/)
});

export type ConsentSignaturePayload = z.infer<typeof consentSignaturePayloadSchema>;

const getConsentHmacKey = (): Buffer => {
  const secret = process.env.CONSENT_HMAC_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('CONSENT_HMAC_KEY is not set');
    }

    return crypto.createHash('sha256').update('development_consent_hmac_key').digest();
  }

  return secret.length === 64
    ? Buffer.from(secret, 'hex')
    : crypto.createHash('sha256').update(secret).digest();
};

/** Сериализует данные детерминированно, чтобы подпись не зависела от порядка ключей JSON. */
export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot serialize a non-finite number');
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  throw new Error('Cannot serialize an undefined value');
};

/** Возвращает SHA-256-хеш канонического JSON-представления данных. */
export const createSha256Hash = (value: unknown): string =>
  crypto.createHash('sha256').update(stableStringify(value)).digest('hex');

/** Подписывает канонический конверт доказательств отдельным ключом согласий. */
export const createConsentSignature = (payload: ConsentSignaturePayload): string =>
  crypto.createHmac('sha256', getConsentHmacKey()).update(stableStringify(payload)).digest('hex');

/** Проверяет неизменность подписанного конверта без раскрытия секретного ключа. */
export const verifyConsentSignature = (
  payload: ConsentSignaturePayload,
  signature: string
): boolean => {
  const expectedSignature = createConsentSignature(payload);
  const actual = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export const parseConsentSignaturePayload = (value: unknown) =>
  consentSignaturePayloadSchema.safeParse(value);
