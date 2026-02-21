import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';

/**
 * API роут для отвязки Google аккаунта от профиля пользователя.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Удаляем аккаунт провайдера google для текущего пользователя
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: 'google'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google unlink error:', error);
    return NextResponse.json(
      { message: 'An error occurred while unlinking Google account' },
      { status: 500 }
    );
  }
}
