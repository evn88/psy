import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { defaultLocale, isLocale } from '@/i18n/config';

/**
 * Возвращает базовый URL приложения.
 */
const getBaseUrl = (request: Request): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const { origin } = new URL(request.url);
  return origin;
};

/**
 * Строит локализованный редирект на /auth с сохранением query-параметра.
 * Без явного locale-префикса middleware теряет query-параметр при добавлении локали.
 */
const authRedirect = (baseUrl: string, locale: string, query: string): NextResponse =>
  NextResponse.redirect(`${baseUrl}/${locale}/auth?${query}`);

/**
 * GET /api/auth/verify-email?token=xxx
 * Верифицирует email пользователя по токену.
 * При успехе — редирект на /{locale}/auth?verified=true.
 * При ошибке — редирект на /{locale}/auth?error=VerificationFailed или expired.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const baseUrl = getBaseUrl(request);

  if (!token) {
    return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
  }

  try {
    // Ищем токен в базе
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token }
    });

    if (!verificationToken) {
      return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
    }

    // Определяем язык пользователя для локализованного редиректа
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: { language: true }
    });
    const locale = isLocale(user?.language ?? '') ? (user!.language as string) : defaultLocale;

    // Проверяем срок действия
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token
          }
        }
      });

      return authRedirect(baseUrl, locale, 'error=VerificationExpired');
    }

    // Устанавливаем emailVerified на пользователе
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() }
    });

    // Удаляем использованный токен
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token
        }
      }
    });

    // Редирект на страницу авторизации с сохранённым query-параметром
    return authRedirect(baseUrl, locale, 'verified=true');
  } catch (error) {
    console.error('Email verification error:', error);
    return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
  }
}
