import 'server-only';

import { EventStatus, EventType, Role } from '@prisma/client';
import { z } from 'zod';

import { decryptData, encryptData } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { getSafeGoogleCalendarSyncUrl } from '@/lib/safe-url';

import { parseICal } from './ical-parser';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_REFRESH_BUFFER_MS = 60_000;

const googleTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional()
});

const googleEventResponseSchema = z.object({
  id: z.string().min(1)
});

const googleCalendarEventsResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        summary: z.string().optional(),
        status: z.string().optional(),
        start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
        end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
        extendedProperties: z
          .object({ private: z.record(z.string(), z.string()).optional() })
          .optional()
      })
    )
    .default([]),
  nextPageToken: z.string().optional()
});

type GoogleTokenResponse = z.infer<typeof googleTokenSchema>;

type GoogleCalendarConnection = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  calendarId: string;
  calendarName: string;
};

export type GoogleSyncResult = {
  success: boolean;
  skipped: boolean;
  message?: string;
};

const getGoogleCredentials = (): { clientId: string; clientSecret: string } => {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar OAuth credentials are not configured');
  }

  return { clientId, clientSecret };
};

/**
 * Возвращает стабильный callback URL для Google OAuth.
 * @param requestUrl - URL текущего запроса для локального fallback.
 * @returns Абсолютный URL callback-обработчика.
 */
export const getGoogleCalendarRedirectUri = (requestUrl: string): string => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  const baseUrl = configuredBaseUrl || new URL(requestUrl).origin;
  return `${baseUrl}/api/google-calendar/callback`;
};

/**
 * Формирует URL согласия Google OAuth для доступа к событиям календаря.
 * @param params - state и callback URL текущей OAuth-сессии.
 * @returns URL страницы согласия Google.
 */
export const createGoogleCalendarAuthorizationUrl = (params: {
  state: string;
  redirectUri: string;
}): string => {
  const { clientId } = getGoogleCredentials();
  const searchParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    state: params.state
  });

  return `${GOOGLE_AUTH_URL}?${searchParams.toString()}`;
};

const requestGoogleToken = async (body: URLSearchParams): Promise<GoogleTokenResponse> => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with status ${response.status}`);
  }

  return googleTokenSchema.parse(await response.json());
};

/**
 * Обменивает authorization code на токены и сведения об основном календаре.
 * @param params - code и callback URL OAuth-сессии.
 * @returns Данные подключения, готовые к безопасному сохранению.
 */
export const exchangeGoogleCalendarCode = async (params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleCalendarConnection> => {
  const { clientId, clientSecret } = getGoogleCredentials();
  const token = await requestGoogleToken(
    new URLSearchParams({
      code: params.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code'
    })
  );
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
    calendarId: 'primary',
    calendarName: 'Google Calendar'
  };
};

/**
 * Сохраняет OAuth-подключение Google Calendar с шифрованием токенов.
 * @param userId - идентификатор администратора.
 * @param connection - токены и сведения о календаре.
 */
export const saveGoogleCalendarConnection = async (
  userId: string,
  connection: GoogleCalendarConnection
): Promise<void> => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarRefreshToken: true }
  });

  const encryptedRefreshToken = connection.refreshToken
    ? encryptData(connection.refreshToken)
    : existingUser?.googleCalendarRefreshToken;

  if (!encryptedRefreshToken) {
    throw new Error('Google did not return a refresh token');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleCalendarAccessToken: encryptData(connection.accessToken),
      googleCalendarRefreshToken: encryptedRefreshToken,
      googleCalendarTokenExpiresAt: connection.expiresAt,
      googleCalendarId: connection.calendarId,
      googleCalendarName: connection.calendarName,
      googleCalendarSyncEnabled: true
    }
  });
};

type CalendarOwner = {
  id: string;
  googleCalendarAccessToken: string | null;
  googleCalendarRefreshToken: string | null;
  googleCalendarTokenExpiresAt: Date | null;
  googleCalendarId: string | null;
  googleCalendarSyncEnabled: boolean;
};

const calendarOwnerSelect = {
  id: true,
  googleCalendarAccessToken: true,
  googleCalendarRefreshToken: true,
  googleCalendarTokenExpiresAt: true,
  googleCalendarId: true,
  googleCalendarSyncEnabled: true
} as const;

const getCalendarOwner = async (
  authorId: string,
  explicitOwnerId?: string
): Promise<CalendarOwner | null> => {
  const preferredOwnerId = explicitOwnerId || authorId;
  const preferredOwner = await prisma.user.findFirst({
    where: {
      id: preferredOwnerId,
      role: Role.ADMIN,
      googleCalendarSyncEnabled: true,
      googleCalendarRefreshToken: { not: null }
    },
    select: calendarOwnerSelect
  });

  if (preferredOwner) {
    return preferredOwner;
  }

  if (explicitOwnerId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      role: Role.ADMIN,
      googleCalendarSyncEnabled: true,
      googleCalendarRefreshToken: { not: null }
    },
    orderBy: { createdAt: 'asc' },
    select: calendarOwnerSelect
  });
};

const getValidAccessToken = async (owner: CalendarOwner): Promise<string> => {
  if (
    owner.googleCalendarAccessToken &&
    owner.googleCalendarTokenExpiresAt &&
    owner.googleCalendarTokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS
  ) {
    return decryptData(owner.googleCalendarAccessToken);
  }

  if (!owner.googleCalendarRefreshToken) {
    throw new Error('Google Calendar refresh token is missing');
  }

  const { clientId, clientSecret } = getGoogleCredentials();
  const token = await requestGoogleToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptData(owner.googleCalendarRefreshToken),
      grant_type: 'refresh_token'
    })
  );
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);

  await prisma.user.update({
    where: { id: owner.id },
    data: {
      googleCalendarAccessToken: encryptData(token.access_token),
      googleCalendarTokenExpiresAt: expiresAt,
      ...(token.refresh_token && {
        googleCalendarRefreshToken: encryptData(token.refresh_token)
      })
    }
  });

  return token.access_token;
};

type SyncableEvent = {
  id: string;
  title: string | null;
  type: EventType;
  status: EventStatus;
  start: Date;
  end: Date;
  meetLink: string | null;
  googleEventId: string | null;
  authorId: string;
  user: { name: string | null; email: string; timezone: string | null } | null;
};

/**
 * Формирует тело события Google Calendar из доменного события расписания.
 * @param event - событие приложения с минимальными данными клиента.
 * @returns Тело запроса Google Calendar API.
 */
export const createGoogleCalendarEventPayload = (event: SyncableEvent) => {
  const defaultTitle =
    event.type === EventType.CONSULTATION ? 'Консультация' : 'Событие расписания';
  const clientLine = event.user ? `Клиент: ${event.user.name || event.user.email}` : null;
  const meetingLine = event.meetLink ? `Ссылка на звонок: ${event.meetLink}` : null;

  return {
    summary: event.title?.trim() || defaultTitle,
    description: [clientLine, meetingLine].filter(Boolean).join('\n') || undefined,
    location: event.meetLink || undefined,
    visibility: 'private',
    start: { dateTime: event.start.toISOString(), timeZone: event.user?.timezone || undefined },
    end: { dateTime: event.end.toISOString(), timeZone: event.user?.timezone || undefined },
    extendedProperties: {
      private: {
        vershkovEventId: event.id
      }
    }
  };
};

const requestGoogleCalendarApi = async (
  url: string,
  accessToken: string,
  init: RequestInit
): Promise<Response> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers
    }
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(`Google Calendar API request failed with status ${response.status}`);
  }

  return response;
};

/**
 * Создаёт, обновляет или удаляет событие в подключённом Google Calendar.
 * @param eventId - идентификатор события приложения.
 * @param action - вид синхронизируемой мутации.
 * @param explicitOwnerId - администратор-владелец календаря для массовой синхронизации.
 * @returns Результат синхронизации без утечки OAuth-данных.
 */
export const syncEventWithGoogle = async (
  eventId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  explicitOwnerId?: string
): Promise<GoogleSyncResult> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      user: { select: { name: true, email: true, timezone: true } }
    }
  });

  if (!event) {
    return { success: false, skipped: true, message: 'event-not-found' };
  }

  const owner = await getCalendarOwner(event.authorId, explicitOwnerId);
  if (!owner) {
    return { success: false, skipped: true, message: 'calendar-not-connected' };
  }

  try {
    const accessToken = await getValidAccessToken(owner);
    const calendarId = encodeURIComponent(owner.googleCalendarId || 'primary');
    const eventPath = event.googleEventId
      ? `${GOOGLE_CALENDAR_API_URL}/calendars/${calendarId}/events/${encodeURIComponent(event.googleEventId)}`
      : null;
    const shouldDelete = action === 'DELETE' || event.status === EventStatus.CANCELLED;

    if (shouldDelete) {
      if (eventPath) {
        await requestGoogleCalendarApi(eventPath, accessToken, { method: 'DELETE' });
      }

      if (action !== 'DELETE') {
        await prisma.event.update({
          where: { id: event.id },
          data: { googleEventId: null, isGoogleSynced: true }
        });
      }

      return { success: true, skipped: !eventPath };
    }

    const payload = createGoogleCalendarEventPayload(event);
    let response = eventPath
      ? await requestGoogleCalendarApi(eventPath, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
      : null;

    if (!response || response.status === 404 || response.status === 410) {
      response = await requestGoogleCalendarApi(
        `${GOOGLE_CALENDAR_API_URL}/calendars/${calendarId}/events`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
    }

    const googleEventId = googleEventResponseSchema.parse(await response.json()).id;
    await prisma.event.update({
      where: { id: event.id },
      data: { googleEventId, isGoogleSynced: true }
    });

    return { success: true, skipped: false };
  } catch (error) {
    console.error('Failed to sync event with Google Calendar', {
      eventId,
      action,
      error: error instanceof Error ? error.message : 'unknown-error'
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { isGoogleSynced: false }
    });
    return { success: false, skipped: false, message: 'google-sync-failed' };
  }
};

/**
 * Отправляет в Google Calendar все актуальные будущие события расписания.
 * @param ownerId - администратор с подключённым календарём.
 * @returns Количество успешных и неуспешных операций.
 */
export const syncFutureEventsWithGoogle = async (
  ownerId: string
): Promise<{ synced: number; failed: number }> => {
  const events: Array<{ id: string }> = await prisma.event.findMany({
    where: {
      end: { gte: new Date() },
      OR: [{ status: { not: EventStatus.CANCELLED } }, { googleEventId: { not: null } }]
    },
    select: { id: true }
  });
  const results: GoogleSyncResult[] = await Promise.all(
    events.map(event => syncEventWithGoogle(event.id, 'UPDATE', ownerId))
  );

  return results.reduce(
    (summary, result) => ({
      synced: summary.synced + (result.success ? 1 : 0),
      failed: summary.failed + (!result.success && !result.skipped ? 1 : 0)
    }),
    { synced: 0, failed: 0 }
  );
};

const createExternalGoogleEvent = (event: {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}): ReturnType<typeof parseICal>[number] | null => {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;
  if (!start || !end) {
    return null;
  }

  return {
    id: `google-${event.id}`,
    title: event.summary?.trim() || 'Событие Google Calendar',
    start: new Date(start),
    end: new Date(end),
    type: EventType.OTHER,
    status: EventStatus.SCHEDULED,
    meetLink: null,
    userId: null,
    isExternal: true
  };
};

/**
 * Читает события подключённого Google Calendar через OAuth API или legacy iCal-фид.
 * События, созданные приложением, исключаются: они уже присутствуют в локальном расписании.
 * @param userId - идентификатор владельца календаря.
 * @param range - необязательный диапазон выборки событий.
 */
export const fetchGoogleEvents = async (userId: string, range?: { start: Date; end: Date }) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleCalendarSyncEnabled) {
      return [];
    }

    if (user.googleCalendarRefreshToken) {
      const accessToken = await getValidAccessToken(user);
      const calendarId = encodeURIComponent(user.googleCalendarId || 'primary');
      const events: ReturnType<typeof parseICal> = [];
      let pageToken: string | undefined;

      do {
        const searchParams = new URLSearchParams({
          singleEvents: 'true',
          maxResults: '2500',
          ...(range && {
            timeMin: range.start.toISOString(),
            timeMax: range.end.toISOString()
          }),
          ...(pageToken && { pageToken })
        });
        const response = await requestGoogleCalendarApi(
          `${GOOGLE_CALENDAR_API_URL}/calendars/${calendarId}/events?${searchParams.toString()}`,
          accessToken,
          { method: 'GET' }
        );
        const page = googleCalendarEventsResponseSchema.parse(await response.json());
        events.push(
          ...page.items
            .filter(
              event =>
                event.status !== 'cancelled' && !event.extendedProperties?.private?.vershkovEventId
            )
            .map(createExternalGoogleEvent)
            .filter(event => event !== null)
        );
        pageToken = page.nextPageToken;
      } while (pageToken);

      return events;
    }

    if (!user.googleCalendarSyncUrl) {
      return [];
    }

    const syncUrl = getSafeGoogleCalendarSyncUrl(user.googleCalendarSyncUrl);
    if (!syncUrl) {
      console.error('Blocked unsafe Google Calendar sync URL', { userId });
      return [];
    }

    const response = await fetch(syncUrl, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    return parseICal(text).map(event => ({
      ...event,
      user: null,
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cancelReason: null
    }));
  } catch (error) {
    console.error('Failed to fetch Google events', error);
    return [];
  }
};
