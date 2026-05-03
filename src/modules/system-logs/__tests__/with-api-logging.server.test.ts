import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  logApiRequest: vi.fn(),
  readResponsePreview: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('../system-log-service.server', () => ({
  logApiRequest: serviceMocks.logApiRequest,
  readResponsePreview: serviceMocks.readResponsePreview
}));

import { withApiLogging } from '../with-api-logging.server';

describe('withApiLogging', () => {
  beforeEach(() => {
    // Arrange
    vi.clearAllMocks();
    serviceMocks.readResponsePreview.mockResolvedValue({ error: 'bad request' });
  });

  it('пишет запись успешного API-запроса', async () => {
    // Arrange
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { 'content-length': '18', 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'request-1' })
    });

    // Act
    const response = await withApiLogging(handler)(request, {});

    // Assert
    expect(response.status).toBe(200);
    expect(serviceMocks.logApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        response,
        requestBody: { id: 'request-1' }
      })
    );
  });

  it('пишет 500 и ошибку при исключении handler', async () => {
    // Arrange
    const error = new Error('Unexpected failure');
    const handler = vi.fn(async () => {
      throw error;
    });
    const request = new Request('https://example.com/api/test', { method: 'GET' });

    // Act
    const response = await withApiLogging(handler)(request, {});

    // Assert
    expect(response.status).toBe(500);
    expect(serviceMocks.logApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        error,
        responseBody: { message: 'Internal server error' }
      })
    );
  });
});
