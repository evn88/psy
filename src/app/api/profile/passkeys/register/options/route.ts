import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import prisma from '@/shared/lib/prisma';
import { cookies } from 'next/headers';

/**
 * Получение домена приложения (Relying Party ID)
 * @returns {string} rpID для WebAuthn
 */
export function getRPID() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    } catch {}
  }
  return 'localhost';
}

export const rpName = 'Vershkov App';
export const rpID = getRPID();

/**
 * GET handler для получения опций регистрации Passkey
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { Authenticator: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем все существующие учетные данные пользователя
    const userAuthenticators = user.Authenticator.map((auth: any) => ({
      id: Buffer.from(auth.credentialID, 'base64'), // В БД хранится base64 строка, как требует Auth.js
      type: 'public-key' as const
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id).toString('base64url'),
      userName: user.email,
      userDisplayName: user.name ?? user.email,
      attestationType: 'none',
      excludeCredentials: userAuthenticators,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform' // Платформенный аутентификатор (TouchID, FaceID, etc)
      }
    });

    // Сохраняем challenge в secure cookie для последующей проверки в `/verify`
    const cookieStore = await cookies();
    cookieStore.set('webauthn_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 5 // 5 минут
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Generate options error:', error);
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 });
  }
}
