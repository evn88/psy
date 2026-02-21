import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

const SUPPORTED_LOCALES = ['en', 'ru'];

/**
 * PUT /api/settings/language
 * Сохраняет язык пользователя в базе данных.
 * Вызывается после авторизации или регистрации для установки определённого языка.
 */
export const PUT = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { language } = body;

    if (!language || !SUPPORTED_LOCALES.includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { language }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update language:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
