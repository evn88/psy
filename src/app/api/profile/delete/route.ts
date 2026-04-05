import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { sendAccountDeletedAdminEmail, sendAccountDeletedUserEmail } from '@/shared/lib/email';

/**
 * GET handler — выполняет удаление аккаунта по токену из email.
 * Проверяет токен, роль пользователя, отправляет уведомления,
 * удаляет аккаунт и очищает JWT-куки для выхода из системы.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (!token || !email) {
    return NextResponse.redirect(`${baseUrl}/?error=invalid-link`);
  }

  const decodedEmail = decodeURIComponent(email);

  const verToken = await prisma.verificationToken.findFirst({
    where: { identifier: `delete-account:${decodedEmail}`, token }
  });

  if (!verToken || verToken.expires < new Date()) {
    return NextResponse.redirect(`${baseUrl}/?error=link-expired`);
  }

  const user = await prisma.user.findUnique({
    where: { email: decodedEmail },
    select: { id: true, email: true, name: true, role: true, language: true }
  });

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/?error=user-not-found`);
  }

  // Повторная защита от удаления администратора
  if (user.role === 'ADMIN') {
    return NextResponse.redirect(`${baseUrl}/?error=admin-protected`);
  }

  try {
    // Отправляем письма до удаления (пока email известен)
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

    // Удаляем токен подтверждения
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `delete-account:${decodedEmail}`, token } }
    });

    // Удаляем пользователя (каскад удалит связанные данные: sessions, accounts, authenticators и т.д.)
    await prisma.user.delete({ where: { id: user.id } });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.redirect(`${baseUrl}/?error=deletion-failed`);
  }

  // Очищаем JWT-куки для немедленного выхода из системы
  const deletedPageLocale = user.language ?? 'ru';
  const response = NextResponse.redirect(`${baseUrl}/${deletedPageLocale}/account-deleted`);
  const cookieOptions = { expires: new Date(0), path: '/' };
  response.cookies.set('next-auth.session-token', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
  response.cookies.set('authjs.session-token', '', cookieOptions);
  response.cookies.set('__Secure-authjs.session-token', '', cookieOptions);
  return response;
}
