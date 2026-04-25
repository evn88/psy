import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const PASSWORD_MIN_LENGTH = 6;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH)
});

/**
 * API для смены пароля пользователя.
 * Доступен только для пользователей, зарегистрированных через credentials (с паролем).
 */
async function postHandler(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    const { currentPassword, newPassword } = result.data;

    // Получаем пользователя с паролем
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    });

    if (!user?.password) {
      return NextResponse.json(
        { message: 'Password change is not available for this account' },
        { status: 400 }
      );
    }

    // Проверяем текущий пароль
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
    }

    // Хешируем и сохраняем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
