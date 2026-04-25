import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { MAX_BLOG_IMAGE_SIZE_BYTES } from '@/configs/files';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

async function postHandler(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Можно загружать только изображения' }, { status: 400 });
  }

  if (file.size > MAX_BLOG_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Размер файла не должен превышать 5 МБ' }, { status: 400 });
  }

  const blob = await put(`blog/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type
  });

  return NextResponse.json({ url: blob.url });
}

export const POST = withApiLogging(postHandler);
