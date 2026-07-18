import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { defaultLocale, isLocale, type AppLocale } from './i18n/config';
import { routing } from './i18n/routing';
import { authConfig } from '@/auth.config';
import {
  isPilloGuestToken,
  PILLO_GUEST_COOKIE_MAX_AGE_SECONDS,
  PILLO_GUEST_COOKIE_NAME
} from '@/modules/pillo/guest';

// Инициализируем auth специально для Edge
const { auth } = NextAuth(authConfig);
const handleI18nRouting = createMiddleware(routing);

/**
 * Проверяет, что маршрут относится к публично доступным mini-app.
 * @param pathname - pathname без locale-префикса.
 * @returns true для mini-app, где разрешён гостевой доступ.
 */
const isPublicMiniAppRoute = (pathname: string): boolean => {
  return pathname === '/app' || pathname.startsWith('/app/pillo');
};

/**
 * Проверяет, что роль может открывать раздел mini-app.
 * @param role - роль пользователя из сессии.
 * @returns true для ролей, которым доступны mini-app.
 */
const canUseMiniApps = (role: string | null | undefined): boolean => {
  return role === 'ADMIN' || role === 'USER' || role === 'GUEST';
};

/**
 * Выдаёт гостевой cookie и перезапускает запрос, чтобы Server Components увидели токен.
 * @param req - входящий запрос.
 * @returns Redirect на тот же URL с гостевым cookie.
 */
const redirectWithPilloGuestCookie = (req: NextRequest): NextResponse => {
  const response = NextResponse.redirect(req.nextUrl);

  response.cookies.set(PILLO_GUEST_COOKIE_NAME, crypto.randomUUID(), {
    httpOnly: true,
    maxAge: PILLO_GUEST_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
};

/**
 * Определяет предпочитаемую локаль по cookie и Accept-Language.
 * @param req - входящий запрос.
 * @returns Локаль, которую следует использовать для редиректа.
 */
const resolvePreferredLocale = (req: NextRequest): AppLocale => {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLang = req.headers.get('accept-language') ?? '';
  const preferred = acceptLang
    .split(',')
    .map(language => language.split(';')[0].trim().substring(0, 2).toLowerCase())
    .find(language => isLocale(language));

  return preferred ?? defaultLocale;
};

/**
 * Извлекает locale-префикс из pathname.
 * @param pathname - внешний pathname запроса.
 * @returns Найденная локаль или `null`.
 */
const getPathnameLocale = (pathname: string): AppLocale | null => {
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  if (!firstSegment || !isLocale(firstSegment)) {
    return null;
  }

  return firstSegment;
};

/**
 * Убирает locale-префикс из pathname, чтобы проверять бизнес-маршруты.
 * @param pathname - внешний pathname запроса.
 * @returns Pathname без locale-префикса.
 */
const stripLocalePrefix = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  if (!isLocale(segments[0]!)) {
    return pathname === '' ? '/' : pathname;
  }

  if (segments.length === 1) {
    return '/';
  }

  return `/${segments.slice(1).join('/')}`;
};

/**
 * Добавляет locale-префикс к внутреннему маршруту.
 * @param locale - локаль, которую нужно префиксовать.
 * @param pathname - внутренний маршрут приложения.
 * @returns Локализованный pathname.
 */
const localizePathname = (locale: AppLocale, pathname: string): string => {
  if (pathname === '/') {
    return `/${locale}`;
  }

  return `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
};

/**
 * Создает locale-aware redirect и синхронизирует cookie `NEXT_LOCALE`.
 * @param req - входящий запрос.
 * @param locale - локаль редиректа.
 * @param pathname - внутренний маршрут назначения.
 * @returns Redirect response.
 */
const redirectToLocalePath = (
  req: NextRequest,
  locale: AppLocale,
  pathname: string
): NextResponse => {
  const response = NextResponse.redirect(new URL(localizePathname(locale, pathname), req.url));

  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    sameSite: 'lax'
  });

  return response;
};

export default async function proxy(req: NextRequest) {
  const locale = getPathnameLocale(req.nextUrl.pathname) ?? resolvePreferredLocale(req);
  const pathname = stripLocalePrefix(req.nextUrl.pathname);

  const session = await auth();
  const isLoggedIn = !!session;
  const userRole = session?.user?.role;

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isMyRoute = pathname === '/my' || pathname.startsWith('/my/');
  const isMiniAppRoute = pathname === '/app' || pathname.startsWith('/app/');

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return redirectToLocalePath(req, locale, '/auth');
    }
    if (userRole !== 'ADMIN') {
      return redirectToLocalePath(req, locale, '/my');
    }
  }

  if (isMyRoute) {
    if (!isLoggedIn) {
      return redirectToLocalePath(req, locale, '/auth');
    }

    if (userRole === 'GUEST') {
      const allowedGuestPaths = ['/my/profile', '/my/settings'];
      const isAllowed = allowedGuestPaths.some(allowedPath => pathname.startsWith(allowedPath));
      if (!isAllowed) {
        return redirectToLocalePath(req, locale, '/my/profile');
      }
    }
  }

  if (isMiniAppRoute) {
    const isPublicMiniApp = isPublicMiniAppRoute(pathname);

    if (!isLoggedIn && isPublicMiniApp) {
      const guestToken = req.cookies.get(PILLO_GUEST_COOKIE_NAME)?.value;

      if (!isPilloGuestToken(guestToken)) {
        return redirectWithPilloGuestCookie(req);
      }

      return handleI18nRouting(req);
    }

    if (!isLoggedIn) {
      return redirectToLocalePath(req, locale, '/auth');
    }

    if (!canUseMiniApps(userRole)) {
      return redirectToLocalePath(req, locale, '/my/profile');
    }
  }

  return handleI18nRouting(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
