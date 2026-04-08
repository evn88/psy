import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Ищем документ в базе данных, чтобы проверить права доступа
    const document = await prisma.clientDocument.findUnique({
      where: { id: documentId },
      include: {
        profile: true
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const userRole = session.user.role || 'USER'; // Ожидается, что role есть в сессии
    // Либо проверяем через БД, если role нет в сессии
    let finalRole = userRole;
    if (finalRole !== 'ADMIN') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      });
      finalRole = dbUser?.role || 'USER';
    }

    // Проверяем доступ: либо владелец (profile.userId), либо ADMIN
    if (document.profile.userId !== session.user.id && finalRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Загружаем файл из Vercel Blob по его url (который, как правило, публичен только для сервера, или содержит специальный токен)
    // Приватные файлы в Vercel Blob скачиваются с использованием fetch + токена, если он встроен, либо через клиент.
    // Из-за того что файл приватный (access: 'private'), мы должны добавить заголовок Authorization или использовать URL, если токен встроен.
    // Обычный fetch() по downloadUrl/url может требовать BLOB_READ_WRITE_TOKEN.

    // В Vercel Blob URL содержит сам файл, но если он приватный, то fetch требует токена.
    const response = await fetch(document.url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error('Vercel Blob Fetch Error:', response.statusText);
      return NextResponse.json({ error: 'Failed to access file' }, { status: 502 });
    }

    // Проксируем ответ клиенту
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${document.filename}"`
      }
    });
  } catch (error) {
    console.error('File Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
