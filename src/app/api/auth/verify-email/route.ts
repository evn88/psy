import prisma from '@/shared/lib/prisma';
import { defaultLocale, isLocale } from '@/i18n/config';
import { NextResponse } from 'next/server';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

/**
 * Возвращает базовый URL приложения.
 * @param request - исходный HTTP-запрос.
 * @returns Абсолютный origin приложения.
 */
const getBaseUrl = (request: Request): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return new URL(request.url).origin;
};

/**
 * Строит локализованный редирект на страницу входа с query-параметром.
 * @param baseUrl - базовый URL приложения.
 * @param locale - locale пользователя.
 * @param query - строка query-параметров.
 * @returns Redirect response.
 */
const authRedirect = (baseUrl: string, locale: string, query: string): NextResponse => {
  return NextResponse.redirect(`${baseUrl}/${locale}/auth?${query}`);
};

/**
 * Строит локализованный редирект на страницу подтверждения email.
 * @param baseUrl - базовый URL приложения.
 * @param locale - locale пользователя.
 * @param token - токен подтверждения.
 * @returns Redirect response.
 */
const verifyEmailPageRedirect = (baseUrl: string, locale: string, token: string): NextResponse => {
  return NextResponse.redirect(
    `${baseUrl}/${locale}/auth/verify-email?token=${encodeURIComponent(token)}`
  );
};

/**
 * Возвращает locale пользователя по email из verification token.
 * @param identifier - email пользователя.
 * @returns Поддерживаемая locale приложения.
 */
const getUserLocaleByIdentifier = async (identifier: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { email: identifier },
    select: { language: true }
  });

  return isLocale(user?.language ?? '') ? user!.language : defaultLocale;
};

/**
 * Возвращает токен подтверждения из POST formData.
 * @param request - исходный HTTP-запрос.
 * @returns Токен подтверждения или `null`.
 */
const getTokenFromFormData = async (request: Request): Promise<string | null> => {
  const formData = await request.formData();
  const tokenValue = formData.get('token');

  if (typeof tokenValue !== 'string') {
    return null;
  }

  const normalizedToken = tokenValue.trim();
  return normalizedToken || null;
};

/**
 * GET /api/auth/verify-email?token=xxx
 * Не меняет состояние аккаунта, а только перенаправляет на confirm-страницу.
 */
async function getHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const baseUrl = getBaseUrl(request);

  if (!token) {
    return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
  }

  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token }
    });

    if (!verificationToken) {
      return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
    }

    const locale = await getUserLocaleByIdentifier(verificationToken.identifier);
    if (verificationToken.expires < new Date()) {
      return authRedirect(baseUrl, locale, 'error=VerificationExpired');
    }

    return verifyEmailPageRedirect(baseUrl, locale, verificationToken.token);
  } catch (error) {
    console.error('Email verification redirect error:', error);
    return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
  }
}

/**
 * POST /api/auth/verify-email
 * Подтверждает email пользователя по one-time токену из формы.
 */
async function postHandler(request: Request) {
  const baseUrl = getBaseUrl(request);
  const token = await getTokenFromFormData(request);

  if (!token) {
    return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
  }

  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token }
    });

    if (!verificationToken) {
      return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
    }

    const locale = await getUserLocaleByIdentifier(verificationToken.identifier);
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

    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() }
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token
        }
      }
    });

    return authRedirect(baseUrl, locale, 'verified=true');
  } catch (error) {
    console.error('Email verification error:', error);
    return authRedirect(baseUrl, defaultLocale, 'error=VerificationFailed');
  }
}

export const GET = withApiLogging(getHandler);
export const POST = withApiLogging(postHandler);
