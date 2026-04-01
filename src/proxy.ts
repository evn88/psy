import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { routing } from './i18n/routing';
import { authConfig } from '@/auth.config';

// Инициализируем auth специально для Edge
const { auth } = NextAuth(authConfig);

const SUPPORTED_LOCALES = routing.locales as unknown as string[];
const DEFAULT_LOCALE = routing.defaultLocale;

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

// Классическое объявление функции middleware
export default async function proxy(req: NextRequest) {
  // 1. Получаем сессию вручную асинхронным вызовом
  const session = await auth();
  const isLoggedIn = !!session;
  // 2. Обращаемся к роли пользователя через session, а не через req.auth
  const userRole = session?.user?.role;

  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/auth');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMyRoute = pathname.startsWith('/my');

  const resolvedLocale = resolveLocale(req);
  const hasLocaleCookie = !!req.cookies.get('NEXT_LOCALE')?.value;

  if (isAuthPage) {
    if (isLoggedIn) {
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl));
      if (userRole === 'USER') return NextResponse.redirect(new URL('/my', req.nextUrl));

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
    if (!isLoggedIn) return NextResponse.redirect(new URL('/auth', req.nextUrl));
    if (userRole !== 'ADMIN') return NextResponse.redirect(new URL('/my', req.nextUrl));
    return null;
  }

  if (isMyRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/auth', req.nextUrl));

    if (userRole === 'GUEST') {
      const allowedGuestPaths = ['/my/profile', '/my/settings'];
      const isAllowed = allowedGuestPaths.some(p => pathname.startsWith(p));
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/my/profile', req.nextUrl));
      }
    }
    return null;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|\\.well-known/workflow).*)'
  ]
};
