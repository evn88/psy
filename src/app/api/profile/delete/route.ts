import prisma from '@/shared/lib/prisma';
import { sendAccountDeletedAdminEmail, sendAccountDeletedUserEmail } from '@/shared/lib/email';
import { defaultLocale, isLocale } from '@/i18n/config';
import { NextRequest, NextResponse } from 'next/server';

const DELETE_ACCOUNT_IDENTIFIER_PREFIX = 'delete-account:';

/**
 * Нормализует locale из query/form значения.
 * @param value - произвольное значение locale.
 * @returns Поддерживаемая locale приложения.
 */
const resolveLocale = (value: string | null): string => {
  return value && isLocale(value) ? value : defaultLocale;
};

/**
 * Строит redirect на страницу подтверждения удаления аккаунта.
 * @param baseUrl - базовый URL приложения.
 * @param locale - locale пользователя.
 * @param params - query-параметры результата.
 * @returns Redirect response.
 */
const accountDeletePageRedirect = (
  baseUrl: string,
  locale: string,
  params: URLSearchParams
): NextResponse => {
  return NextResponse.redirect(`${baseUrl}/${locale}/account/delete?${params.toString()}`);
};

/**
 * Возвращает email из identifier verification token.
 * @param identifier - строка вида `delete-account:user@example.com`.
 * @returns Email пользователя.
 */
const getEmailFromDeleteIdentifier = (identifier: string): string => {
  return identifier.replace(DELETE_ACCOUNT_IDENTIFIER_PREFIX, '');
};

/**
 * Ищет verification token для подтверждения удаления аккаунта.
 * @param token - токен из URL или формы.
 * @returns Найденный verification token или `null`.
 */
const findDeleteAccountToken = async (token: string) => {
  return prisma.verificationToken.findFirst({
    where: {
      token,
      identifier: {
        startsWith: DELETE_ACCOUNT_IDENTIFIER_PREFIX
      }
    }
  });
};

/**
 * Возвращает locale пользователя по identifier токена удаления аккаунта.
 * @param identifier - identifier verification token.
 * @returns Поддерживаемая locale приложения.
 */
const getDeleteAccountLocale = async (identifier: string): Promise<string> => {
  const email = getEmailFromDeleteIdentifier(identifier);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { language: true }
  });

  return resolveLocale(user?.language ?? null);
};

/**
 * Возвращает базовый URL приложения.
 * @returns Абсолютный origin приложения.
 */
const getBaseUrl = (): string => {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
};

/**
 * GET /api/profile/delete
 * Не выполняет удаление, а только переводит пользователя на confirm-страницу.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const baseUrl = getBaseUrl();

  if (!token) {
    return accountDeletePageRedirect(
      baseUrl,
      defaultLocale,
      new URLSearchParams({ error: 'invalid-link' })
    );
  }

  const verToken = await findDeleteAccountToken(token);
  if (!verToken) {
    return accountDeletePageRedirect(
      baseUrl,
      defaultLocale,
      new URLSearchParams({ error: 'invalid-link' })
    );
  }

  const locale = await getDeleteAccountLocale(verToken.identifier);
  if (verToken.expires < new Date()) {
    return accountDeletePageRedirect(
      baseUrl,
      locale,
      new URLSearchParams({ error: 'link-expired' })
    );
  }

  return accountDeletePageRedirect(baseUrl, locale, new URLSearchParams({ token: verToken.token }));
}

/**
 * POST /api/profile/delete
 * Удаляет аккаунт только после явного подтверждения на confirm-странице.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const tokenValue = formData.get('token');
  const localeValue = formData.get('locale');
  const baseUrl = getBaseUrl();
  const fallbackLocale = resolveLocale(typeof localeValue === 'string' ? localeValue : null);

  if (typeof tokenValue !== 'string' || !tokenValue.trim()) {
    return accountDeletePageRedirect(
      baseUrl,
      fallbackLocale,
      new URLSearchParams({ error: 'invalid-link' })
    );
  }

  const token = tokenValue.trim();
  const verToken = await findDeleteAccountToken(token);
  if (!verToken) {
    return accountDeletePageRedirect(
      baseUrl,
      fallbackLocale,
      new URLSearchParams({ error: 'invalid-link' })
    );
  }

  const locale = await getDeleteAccountLocale(verToken.identifier);
  if (verToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verToken.identifier,
          token: verToken.token
        }
      }
    });

    return accountDeletePageRedirect(
      baseUrl,
      locale,
      new URLSearchParams({ error: 'link-expired' })
    );
  }

  const userEmail = getEmailFromDeleteIdentifier(verToken.identifier);
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, email: true, name: true, role: true, language: true }
  });

  if (!user) {
    return accountDeletePageRedirect(
      baseUrl,
      locale,
      new URLSearchParams({ error: 'user-not-found' })
    );
  }

  if (user.role === 'ADMIN') {
    return accountDeletePageRedirect(
      baseUrl,
      locale,
      new URLSearchParams({ error: 'admin-protected' })
    );
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    await Promise.all([
      sendAccountDeletedUserEmail({
        to: user.email,
        name: user.name ?? user.email,
        language: user.language ?? 'ru'
      }),
      adminEmail
        ? sendAccountDeletedAdminEmail({
            to: adminEmail,
            name: user.name ?? user.email,
            email: user.email
          })
        : Promise.resolve()
    ]);

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verToken.identifier,
          token: verToken.token
        }
      }
    });

    await prisma.user.delete({
      where: { id: user.id }
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return accountDeletePageRedirect(
      baseUrl,
      locale,
      new URLSearchParams({ error: 'deletion-failed' })
    );
  }

  const deletedPageLocale = resolveLocale(user.language ?? null);
  const response = NextResponse.redirect(`${baseUrl}/${deletedPageLocale}/account-deleted`);
  const cookieOptions = { expires: new Date(0), path: '/' };
  response.cookies.set('next-auth.session-token', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
  response.cookies.set('authjs.session-token', '', cookieOptions);
  response.cookies.set('__Secure-authjs.session-token', '', cookieOptions);
  return response;
}
