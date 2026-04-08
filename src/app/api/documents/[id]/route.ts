import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { decryptBuffer } from '@/shared/lib/crypto';

type RouteContext = { params: Promise<{ id: string }> };

/** Проверяет сессию и возвращает { userId, isAdmin } или null при отказе */
async function resolveAccess(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  return { userId, isAdmin: dbUser?.role === 'ADMIN' };
}

/** GET /api/documents/[id] — скачивание и расшифровка файла */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await resolveAccess(session.user.id);
    const { id } = await params;
    const document = await prisma.clientDocument.findUnique({ where: { id } });

    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (document.userId !== access.userId && !access.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Скачиваем зашифрованный файл из приватного Vercel Blob store
    const response = await fetch(document.url, {
      headers: { Authorization: `Bearer ${process.env.PRIVATE_BLOB_READ_WRITE_TOKEN}` }
    });

    if (!response.ok) {
      console.error('Vercel Blob fetch error:', response.statusText);
      return NextResponse.json({ error: 'Failed to access file' }, { status: 502 });
    }

    // Расшифровываем буфер
    const encryptedBuffer = Buffer.from(await response.arrayBuffer());
    const decryptedBuffer = decryptBuffer(encryptedBuffer);
    const encodedName = encodeURIComponent(document.name);

    return new NextResponse(new Uint8Array(decryptedBuffer), {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(decryptedBuffer.length)
      }
    });
  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** DELETE /api/documents/[id] — удаление файла из Blob и БД */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await resolveAccess(session.user.id);
    const { id } = await params;
    const document = await prisma.clientDocument.findUnique({ where: { id } });

    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (document.userId !== access.userId && !access.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await del(document.url);
    await prisma.clientDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** PATCH /api/documents/[id] — переименование файла */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await resolveAccess(session.user.id);
    const { id } = await params;
    const document = await prisma.clientDocument.findUnique({ where: { id } });

    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (document.userId !== access.userId && !access.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : null;

    if (!name) {
      return NextResponse.json({ error: 'Имя файла не может быть пустым' }, { status: 400 });
    }

    const updated = await prisma.clientDocument.update({
      where: { id },
      data: { name },
      select: { id: true, name: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Document rename error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
