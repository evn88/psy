import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';

/**
 * GET /api/auth/verify-email?token=xxx
 * Верифицирует email пользователя по токену.
 * При успехе — редирект на /my?verified=true.
 * При ошибке — редирект на /auth?error=VerificationFailed или expired.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth?error=VerificationFailed', request.url));
  }

  try {
    // Ищем токен в базе
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token }
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/auth?error=VerificationFailed', request.url));
    }

    // Проверяем срок действия
    if (verificationToken.expires < new Date()) {
      // Удаляем просроченный токен
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token
          }
        }
      });

      return NextResponse.redirect(new URL('/auth?error=VerificationExpired', request.url));
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

    // Редирект на страницу авторизации с индикатором успеха
    return NextResponse.redirect(new URL('/auth?verified=true', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/auth?error=VerificationFailed', request.url));
  }
}
