import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPilloReminderActionToken } from '../tokens';

describe('Pillo reminder action token', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('создаёт стабильный токен для повторной доставки одного приёма', () => {
    // Arrange
    vi.stubEnv('AUTH_SECRET', 'test-secret-with-enough-entropy');

    // Act
    const firstToken = createPilloReminderActionToken('intake-1');
    const repeatedToken = createPilloReminderActionToken('intake-1');
    const anotherToken = createPilloReminderActionToken('intake-2');

    // Assert
    expect(repeatedToken).toBe(firstToken);
    expect(anotherToken).not.toBe(firstToken);
  });

  it('запрещает выпуск токена без серверного секрета', () => {
    // Arrange
    vi.stubEnv('AUTH_SECRET', '');

    // Act + Assert
    expect(() => createPilloReminderActionToken('intake-1')).toThrow(
      'AUTH_SECRET is required for Pillo reminder action tokens'
    );
  });
});
