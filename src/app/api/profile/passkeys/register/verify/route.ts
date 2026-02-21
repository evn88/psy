import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import prisma from '@/shared/lib/prisma';
import { cookies } from 'next/headers';
import { getRPID, getExpectedOrigin } from '../config';

/**
 * POST handler для проверки и сохранения Passkey
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();

    // Подхватываем challenge из куков
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('webauthn_challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
    }

    let verification;
    try {
      const currentRpID = getRPID();
      const origin = getExpectedOrigin();

      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: currentRpID
      });
    } catch (error: any) {
      console.error('Verification failed:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const {
        credentialID,
        credentialPublicKey,
        counter,
        credentialDeviceType,
        credentialBackedUp
      } = registrationInfo;

      // NextAuth.js WebAuthn provider encodes credentialID in base64 (not base64url)
      // See: https://errors.authjs.dev#autherror where it printed {"credentialID":"54NPD4cfWf73tZFIHzT5ZQ=="}
      const credentialIDBase64 = Buffer.from(credentialID).toString('base64');

      // Сохраняем новый Authenticator в БД
      await prisma.authenticator.create({
        data: {
          credentialID: credentialIDBase64,
          credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
          counter: counter,
          credentialDeviceType: credentialDeviceType,
          credentialBackedUp: credentialBackedUp,
          transports: body.response.transports?.join(',') || '',
          providerAccountId: credentialIDBase64, // NextAuth требует это поле
          userId: user.id
        }
      });

      // NextAuth.js (Auth.js v5) также требует наличия записи Account для WebAuthn
      // Иначе при логине будет ошибка "WebAuthn account not found in database"
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'webauthn',
            providerAccountId: credentialIDBase64
          }
        },
        update: {},
        create: {
          userId: user.id,
          type: 'webauthn',
          provider: 'webauthn',
          providerAccountId: credentialIDBase64
        }
      });

      // Очищаем cookie
      cookieStore.delete('webauthn_challenge');

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: 'Verification returned false' }, { status: 400 });
  } catch (error) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
