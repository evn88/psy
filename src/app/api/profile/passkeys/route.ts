import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';

/**
 * GET handler для получения списка Passkey пользователя.
 */
export async function GET() {
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

    const passkeys = await prisma.authenticator.findMany({
      where: { userId: user.id },
      select: {
        credentialID: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        transports: true
      }
    });

    return NextResponse.json({ passkeys });
  } catch (error) {
    console.error('Get passkeys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE handler для удаления Passkey пользователя.
 * Если передан query-параметр ?id=credentialID — удаляет один конкретный passkey.
 * Без параметра — удаляет все passkeys пользователя.
 */
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('id');

    if (credentialId) {
      // Удаляем один конкретный passkey — только если он принадлежит этому пользователю
      const deleted = await prisma.authenticator.deleteMany({
        where: { credentialID: credentialId, userId: user.id }
      });

      if (deleted.count === 0) {
        return NextResponse.json({ error: 'Passkey not found' }, { status: 404 });
      }

      await prisma.account.deleteMany({
        where: { userId: user.id, provider: 'webauthn', providerAccountId: credentialId }
      });
    } else {
      // Удаляем все passkeys пользователя
      await prisma.authenticator.deleteMany({
        where: { userId: user.id }
      });

      await prisma.account.deleteMany({
        where: { userId: user.id, provider: 'webauthn' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete passkeys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
