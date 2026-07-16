import { EventStatus, EventType } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  event: {
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
    prismaMock.event.findUnique.mockResolvedValue(baseEvent);
    prismaMock.event.update.mockResolvedValue(baseEvent);
    prismaMock.user.findFirst.mockResolvedValue(calendarOwner);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
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
