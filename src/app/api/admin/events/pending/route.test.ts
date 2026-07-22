import { EventStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  event: {
    findMany: vi.fn()
  }
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/modules/system-logs/with-api-logging.server', () => ({
  withApiLogging: <T extends (...args: never[]) => unknown>(handler: T): T => handler
}));

import { GET } from './route';

describe('GET /api/admin/events/pending', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
  });

  it('возвращает часовой пояс клиента для корректного времени в форме подтверждения', async () => {
    // Arrange
    prismaMock.event.findMany.mockResolvedValue([
      {
        id: 'event-1',
        status: EventStatus.PENDING_CONFIRMATION,
        start: new Date('2026-07-20T13:30:00.000Z'),
        end: new Date('2026-07-20T14:30:00.000Z'),
        user: {
          id: 'user-1',
          name: 'Клиент',
          email: 'client@example.com',
          timezone: 'Europe/Belgrade'
        }
      }
    ]);

    // Act
    const response = await GET(new Request('http://localhost/api/admin/events/pending'), {
      params: Promise.resolve({})
    });
    const events = (await response.json()) as Array<{
      user: { timezone: string | null };
    }>;

    // Assert
    expect(response.status).toBe(200);
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          rescheduleFrom: {
            select: {
              id: true,
              start: true,
              end: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              timezone: true
            }
          }
        }
      })
    );
    expect(events[0]?.user.timezone).toBe('Europe/Belgrade');
  });
});
