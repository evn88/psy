import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

/**
 * API роут для отвязки Google аккаунта от профиля пользователя.
 */
async function deleteHandler() {
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

export const DELETE = withApiLogging(deleteHandler);
