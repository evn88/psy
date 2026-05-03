import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));

import { getInitiatorIp } from '../request-context.server';

describe('getInitiatorIp', () => {
  it('возвращает первый IP из x-forwarded-for', () => {
    // Arrange
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10, 198.51.100.20',
      'x-real-ip': '198.51.100.30'
    });

    // Act
    const ip = getInitiatorIp(headers);

    // Assert
    expect(ip).toBe('203.0.113.10');
  });
});
