import { EventStatus, EventType } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  event: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/crypto', () => ({
  decryptData: (value: string) => value,
  encryptData: (value: string) => value
}));

import {
  createGoogleCalendarAuthorizationUrl,
  createGoogleCalendarEventPayload,
  fetchGoogleEvents,
  syncFutureEventsWithGoogle,
  syncEventWithGoogle
} from '@/lib/google-sync';

const baseEvent = {
  id: 'event-1',
  title: 'Первая консультация',
  type: EventType.CONSULTATION,
  status: EventStatus.SCHEDULED,
  start: new Date('2026-07-16T14:30:00.000Z'),
  end: new Date('2026-07-16T15:30:00.000Z'),
  meetLink: 'https://meet.google.com/abc-defg-hij',
  googleEventId: null,
  authorId: 'admin-1',
  user: {
    name: 'Анна Клиент',
    email: 'client@example.com',
    timezone: 'America/New_York'
  }
};

const calendarOwner = {
  id: 'admin-1',
  googleCalendarAccessToken: 'access-token',
  googleCalendarRefreshToken: 'refresh-token',
  googleCalendarTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  googleCalendarId: 'primary',
  googleCalendarSyncEnabled: true
};

describe('Google Calendar sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.event.findMany.mockResolvedValue([]);
    prismaMock.event.findUnique.mockResolvedValue(baseEvent);
    prismaMock.event.update.mockResolvedValue(baseEvent);
    prismaMock.user.findFirst.mockResolvedValue(calendarOwner);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
  });

  it('формирует OAuth URL с offline-доступом и защитным state', () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'client-secret';

    const authorizationUrl = new URL(
      createGoogleCalendarAuthorizationUrl({
        state: 'secure-state',
        redirectUri: 'https://example.com/api/google-calendar/callback'
      })
    );

    expect(authorizationUrl.origin).toBe('https://accounts.google.com');
    expect(authorizationUrl.searchParams.get('access_type')).toBe('offline');
    expect(authorizationUrl.searchParams.get('state')).toBe('secure-state');
    expect(authorizationUrl.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/calendar.events'
    );
    expect(authorizationUrl.searchParams.get('prompt')).toBe('consent select_account');
  });

  it('использует настройки Google-входа, если отдельные OAuth-переменные не заданы', () => {
    process.env.AUTH_GOOGLE_ID = 'auth-google-client-id';
    process.env.AUTH_GOOGLE_SECRET = 'auth-google-client-secret';

    const authorizationUrl = new URL(
      createGoogleCalendarAuthorizationUrl({
        state: 'secure-state',
        redirectUri: 'https://example.com/api/google-calendar/callback'
      })
    );

    expect(authorizationUrl.searchParams.get('client_id')).toBe('auth-google-client-id');
  });

  it('читает заголовки внешних событий из подключённого Google Calendar', async () => {
    prismaMock.user.findUnique.mockResolvedValue(calendarOwner);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'external-event-1',
              summary: 'Личная встреча',
              status: 'confirmed',
              start: { dateTime: '2026-07-18T10:00:00.000Z' },
              end: { dateTime: '2026-07-18T11:00:00.000Z' }
            },
            {
              id: 'synced-event-1',
              summary: 'Консультация',
              status: 'confirmed',
              start: { dateTime: '2026-07-18T12:00:00.000Z' },
              end: { dateTime: '2026-07-18T13:00:00.000Z' },
              extendedProperties: { private: { vershkovEventId: 'event-1' } }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const events = await fetchGoogleEvents('admin-1', {
      start: new Date('2026-07-18T00:00:00.000Z'),
      end: new Date('2026-07-19T00:00:00.000Z')
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'google-external-event-1',
      title: 'Личная встреча',
      isExternal: true
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('timeMin=2026-07-18T00%3A00%3A00.000Z'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('формирует событие с timezone клиента и внутренним идентификатором', () => {
    const payload = createGoogleCalendarEventPayload(baseEvent);

    expect(payload.start).toEqual({
      dateTime: '2026-07-16T14:30:00.000Z',
      timeZone: 'America/New_York'
    });
    expect(payload.extendedProperties.private.vershkovEventId).toBe('event-1');
    expect(payload.description).toContain('Анна Клиент');
    expect(payload.description).not.toContain('client@example.com');
    expect(payload.visibility).toBe('private');
  });

  it('создаёт новое событие в основном Google Calendar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'google-event-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncEventWithGoogle('event-1', 'CREATE');

    expect(result).toEqual({ success: true, skipped: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      expect.objectContaining({ method: 'POST' })
    );
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { googleEventId: 'google-event-1', isGoogleSynced: true }
    });
  });

  it('не использует календарь другого администратора для события', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncEventWithGoogle('event-1', 'CREATE');

    expect(result).toEqual({
      success: false,
      skipped: true,
      message: 'calendar-not-connected'
    });
    expect(prismaMock.user.findFirst).toHaveBeenCalledOnce();
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'admin-1' })
      })
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('массово синхронизирует только события владельца календаря', async () => {
    const result = await syncFutureEventsWithGoogle('admin-1');

    expect(result).toEqual({ synced: 0, failed: 0 });
    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: {
        authorId: 'admin-1',
        end: { gte: expect.any(Date) },
        OR: [{ status: { not: EventStatus.CANCELLED } }, { googleEventId: { not: null } }]
      },
      select: { id: true }
    });
  });

  it('удаляет связанное событие Google при отмене записи', async () => {
    prismaMock.event.findUnique.mockResolvedValue({
      ...baseEvent,
      status: EventStatus.CANCELLED,
      googleEventId: 'google-event-1'
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncEventWithGoogle('event-1', 'UPDATE');

    expect(result).toEqual({ success: true, skipped: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/google-event-1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { googleEventId: null, isGoogleSynced: true }
    });
  });

  it('обновляет ранее связанное событие без создания дубля', async () => {
    prismaMock.event.findUnique.mockResolvedValue({
      ...baseEvent,
      googleEventId: 'google-event-1'
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'google-event-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncEventWithGoogle('event-1', 'UPDATE');

    expect(result).toEqual({ success: true, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/google-event-1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
