import { NextResponse } from 'next/server';
import { locales } from '@/i18n/config';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/**
 * PUT /api/settings/language
 * Сохраняет язык пользователя в базе данных.
 * Вызывается после авторизации или регистрации для установки определённого языка.
 */
const putHandler = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { language } = body;

    if (!language || !locales.includes(language as any)) {
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

export const PUT = withApiLogging(putHandler);
