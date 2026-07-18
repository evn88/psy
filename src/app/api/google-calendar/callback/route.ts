import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  exchangeGoogleCalendarCode,
  getGoogleCalendarRedirectUri,
  saveGoogleCalendarConnection,
  syncFutureEventsWithGoogle
} from '@/lib/google-sync';

const GOOGLE_OAUTH_STATE_COOKIE = 'google_calendar_oauth_state';
const GOOGLE_OAUTH_LOCALE_COOKIE = 'google_calendar_oauth_locale';
const SUPPORTED_LOCALES = new Set(['ru', 'en', 'sr']);

const createScheduleRedirect = (requestUrl: string, locale: string, status: string): URL => {
  return new URL(`/${locale}/admin/schedule?google=${status}`, requestUrl);
};

/**
 * Завершает OAuth-поток, сохраняет зашифрованные токены и запускает первичную синхронизацию.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const storedLocale = cookieStore.get(GOOGLE_OAUTH_LOCALE_COOKIE)?.value || 'ru';
  const locale = SUPPORTED_LOCALES.has(storedLocale) ? storedLocale : 'ru';
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get('state');
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');

  if (oauthError || !code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(createScheduleRedirect(request.url, locale, 'connection-error'));
  }

  try {
    const connection = await exchangeGoogleCalendarCode({
      code,
      redirectUri: getGoogleCalendarRedirectUri(request.url)
    });
    await saveGoogleCalendarConnection(session.user.id, connection);
    const syncResult = await syncFutureEventsWithGoogle(session.user.id);
    const status = syncResult.failed > 0 ? 'connected-with-errors' : 'connected';
    const response = NextResponse.redirect(createScheduleRedirect(request.url, locale, status));
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', {
      path: '/api/google-calendar',
      maxAge: 0
    });
    response.cookies.set(GOOGLE_OAUTH_LOCALE_COOKIE, '', {
      path: '/api/google-calendar',
      maxAge: 0
    });
    return response;
  } catch (error) {
    console.error('Failed to complete Google Calendar OAuth', {
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'unknown-error'
    });
    return NextResponse.redirect(createScheduleRedirect(request.url, locale, 'connection-error'));
  }
}
