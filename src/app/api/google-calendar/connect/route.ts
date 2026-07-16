import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  createGoogleCalendarAuthorizationUrl,
  getGoogleCalendarRedirectUri
} from '@/lib/google-sync';

const GOOGLE_OAUTH_STATE_COOKIE = 'google_calendar_oauth_state';
const GOOGLE_OAUTH_LOCALE_COOKIE = 'google_calendar_oauth_locale';
const SUPPORTED_LOCALES = new Set(['ru', 'en', 'sr']);

/**
 * Начинает безопасный OAuth-поток подключения Google Calendar.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const requestedLocale = requestUrl.searchParams.get('locale') || 'ru';
  const locale = SUPPORTED_LOCALES.has(requestedLocale) ? requestedLocale : 'ru';
  const state = crypto.randomBytes(32).toString('hex');

  try {
    const authorizationUrl = createGoogleCalendarAuthorizationUrl({
      state,
      redirectUri: getGoogleCalendarRedirectUri(request.url)
    });
    const response = NextResponse.redirect(authorizationUrl);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/google-calendar',
      maxAge: 10 * 60
    };

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
    response.cookies.set(GOOGLE_OAUTH_LOCALE_COOKIE, locale, cookieOptions);
    return response;
  } catch (error) {
    console.error('Failed to start Google Calendar OAuth', {
      error: error instanceof Error ? error.message : 'unknown-error'
    });
    return NextResponse.redirect(
      new URL(`/${locale}/admin/schedule?google=configuration-error`, request.url)
    );
  }
}
