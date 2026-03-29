import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get('locale') ?? 'ru';

  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, image: true } },
      translations: true,
      categories: { include: { category: true } }
    }
  });

  if (!post) {
    return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
  }

  // Находим нужный перевод с откатом на русский
  const translation =
    post.translations.find((t: { locale: string }) => t.locale === locale) ??
    post.translations.find((t: { locale: string }) => t.locale === 'ru') ??
    post.translations[0];

  return NextResponse.json({ ...post, activeTranslation: translation });
}
