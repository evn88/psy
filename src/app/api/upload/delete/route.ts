import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL не передан' }, { status: 400 });
  }

  try {
    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Blob delete error:', error);
    return NextResponse.json({ error: 'Не удалось удалить файл' }, { status: 500 });
  }
}
