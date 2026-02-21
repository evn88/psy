import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const { auth } = NextAuth(authConfig);

const SUPPORTED_LOCALES = routing.locales as unknown as string[];
const DEFAULT_LOCALE = routing.defaultLocale;

/**
 * Определяет locale из cookie или Accept-Language заголовка.
 * @param req - входящий запрос
 * @returns поддерживаемый locale или defaultLocale
 */
const resolveLocale = (req: NextRequest): string => {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLang = req.headers.get('accept-language') ?? '';
  const preferred = acceptLang
    .split(',')
    .map(l => l.split(';')[0].trim().substring(0, 2).toLowerCase())
    .find(l => SUPPORTED_LOCALES.includes(l));

  return preferred ?? DEFAULT_LOCALE;
};

export default auth(req => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/auth');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMyRoute = pathname.startsWith('/my');

  // Устанавливаем cookie NEXT_LOCALE если оно ещё не задано
  const resolvedLocale = resolveLocale(req);
  const hasLocaleCookie = !!req.cookies.get('NEXT_LOCALE')?.value;

  if (isAuthPage) {
    if (isLoggedIn) {
      // @ts-ignore
      const role = req.auth?.user?.role;
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.nextUrl));
      }
      if (role === 'USER') {
        return NextResponse.redirect(new URL('/my', req.nextUrl));
      }
      // GUEST → только профиль в ЛК
      return NextResponse.redirect(new URL('/my/profile', req.nextUrl));
    }

    if (!hasLocaleCookie) {
      const response = NextResponse.next();
      response.cookies.set('NEXT_LOCALE', resolvedLocale, { path: '/' });
      return response;
    }

    return null;
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth', req.nextUrl));
    }
    // @ts-ignore
    if (req.auth.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/my', req.nextUrl));
    }
    return null;
  }

  if (isMyRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth', req.nextUrl));
    }

    // @ts-ignore
    const role = req.auth?.user?.role;

    // GUEST может видеть только /my/profile и /my/settings
    if (role === 'GUEST') {
      const allowedGuestPaths = ['/my/profile', '/my/settings'];
      const isAllowed = allowedGuestPaths.some(p => pathname.startsWith(p));
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/my/profile', req.nextUrl));
      }
    }

    return null;
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
