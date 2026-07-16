import { describe, expect, it } from 'vitest';
import {
  createConsentSignature,
  createSha256Hash,
  stableStringify,
  verifyConsentSignature,
  type ConsentSignaturePayload
} from '../consent-signature';

const payload: ConsentSignaturePayload = {
  schemaVersion: 1,
  consentType: 'INTAKE_FORM_SUBMIT:ru:v2',
  userId: 'user-1',
  agreedAt: '2026-07-16T10:00:00.000Z',
  ip: '127.0.0.1',
  userAgent: 'Vitest',
  form: { locale: 'ru', version: 2, snapshotHash: 'a'.repeat(64) },
  answersHash: 'b'.repeat(64)
};

describe('подпись согласия', () => {
  it('создаёт одинаковый хеш для объектов с разным порядком ключей', () => {
    expect(createSha256Hash({ second: 2, first: 1 })).toBe(
      createSha256Hash({ first: 1, second: 2 })
    );
    expect(stableStringify({ second: 2, first: 1 })).toBe('{"first":1,"second":2}');
  });

  it('подтверждает исходный конверт и отклоняет изменённый', () => {
    const signature = createConsentSignature(payload);

    expect(verifyConsentSignature(payload, signature)).toBe(true);
    expect(verifyConsentSignature({ ...payload, answersHash: 'c'.repeat(64) }, signature)).toBe(
      false
    );
  });
});
