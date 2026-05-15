import { describe, expect, it } from 'vitest';

import { getPilloGuestEmail, isPilloGuestEmail, isPilloGuestToken } from '../guest';

describe('pillo guest helpers', () => {
  it('принимает только UUID v4 токен гостевого доступа', () => {
    expect(isPilloGuestToken('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isPilloGuestToken('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
    expect(isPilloGuestToken('javascript:alert(1)')).toBe(false);
    expect(isPilloGuestToken(undefined)).toBe(false);
  });

  it('строит стабильный технический email для гостевого пользователя', () => {
    expect(getPilloGuestEmail('550e8400-e29b-41d4-a716-446655440000')).toBe(
      'pillo-guest-550e8400-e29b-41d4-a716-446655440000@pillo-guest.local'
    );
  });

  it('отличает технический email гостя от пользовательского email', () => {
    expect(
      isPilloGuestEmail('pillo-guest-550e8400-e29b-41d4-a716-446655440000@pillo-guest.local')
    ).toBe(true);
    expect(isPilloGuestEmail('user@example.com')).toBe(false);
    expect(isPilloGuestEmail(null)).toBe(false);
  });
});
