import { NextResponse } from 'next/server';
import { locales } from '@/i18n/config';
import prisma from '@/shared/lib/prisma';
import { getBlogLocale } from '@/shared/lib/blog-utils';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

async function getHandler(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = getBlogLocale(searchParams.get('locale') ?? 'ru', locales);
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '10');
  const skip = (page - 1) * limit;

  const where = {
    status: 'PUBLISHED' as const,
    ...(category && {
      categories: { some: { category: { slug: category } } }
    })
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, image: true } },
        translations: {
          where: { locale: { in: [locale, 'ru'] } },
          select: { locale: true, title: true, description: true }
        },
        categories: { include: { category: true } }
      }
    }),
    prisma.blogPost.count({ where })
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export const GET = withApiLogging(getHandler);
