import { describe, expect, it } from 'vitest';
import { redactLogPayload } from '../redact-log-payload';

describe('redactLogPayload', () => {
  it('удаляет чувствительные значения из вложенного payload', () => {
    // Arrange
    const payload = {
      authorization: 'Bearer token',
      cookie: 'session=secret',
      profile: {
        password: 'secret-password',
        apiKey: 'private-key',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        safeValue: 'visible'
      }
    };

    // Act
    const result = redactLogPayload(payload);

    // Assert
    expect(result).toMatchObject({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      profile: {
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        access_token: '[REDACTED]',
        refresh_token: '[REDACTED]',
        safeValue: 'visible'
      }
    });
  });
});
