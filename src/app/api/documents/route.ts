import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { encryptBuffer } from '@/shared/lib/crypto';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE_BYTES } from '@/configs/files';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

async function postHandler(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    const isAdmin = dbUser?.role === 'ADMIN';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetUserId = formData.get('targetUserId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }

    // Только администратор может загружать файлы для другого пользователя
    if (targetUserId && targetUserId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ownerId = targetUserId ?? session.user.id;

    // Валидация типа файла
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
      return NextResponse.json(
        { error: `Недопустимый тип файла. Разрешены: PDF, изображения, DOC/DOCX` },
        { status: 400 }
      );
    }

    // Валидация размера
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      const maxMb = MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024);
      return NextResponse.json(
        { error: `Размер файла не должен превышать ${maxMb} МБ` },
        { status: 400 }
      );
    }

    // Шифрование файла перед загрузкой
    const arrayBuffer = await file.arrayBuffer();
    const encryptedBuffer = encryptBuffer(Buffer.from(arrayBuffer));

    // Загрузка зашифрованного файла в Vercel Blob (private)
    const blobPath = `documents/${ownerId}/${Date.now()}.enc`;
    const blob = await put(blobPath, encryptedBuffer, {
      access: 'private',
      contentType: 'application/octet-stream',
      token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN
    });

    // Запись метаданных в БД
    const document = await prisma.clientDocument.create({
      data: {
        userId: ownerId,
        url: blob.url,
        name: file.name,
        fileType: file.type,
        size: file.size,
        uploadedById: session.user.id
      }
    });

    return NextResponse.json(
      { id: document.id, name: document.name, uploadedById: document.uploadedById },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Document upload error:', message);
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(postHandler);
