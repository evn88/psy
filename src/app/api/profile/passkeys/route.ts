import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';

/**
 * DELETE handler для удаления всех Passkey пользователя
 */
export async function DELETE() {
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

    // Удаляем все аутентификаторы пользователя
    await prisma.authenticator.deleteMany({
      where: { userId: user.id }
    });

    // Также удаляем связанные Account записи
    await prisma.account.deleteMany({
      where: { userId: user.id, provider: 'webauthn' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete passkeys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
