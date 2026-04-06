import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { calculateReadingTime, generateSlug } from '@/shared/lib/blog-utils';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  content: z.string().default(''),
  coverImage: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  authorId: z.string().min(1).optional()
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, image: true } },
        translations: { select: { locale: true, title: true, description: true } },
        categories: { include: { category: true } }
      }
    }),
    prisma.blogPost.count()
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Неверные данные', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, content, coverImage, categoryIds, authorId } = parsed.data;
  const resolvedAuthorId = authorId ?? session.user.id!;

  const author = await prisma.user.findUnique({
    where: { id: resolvedAuthorId },
    select: { id: true }
  });

  if (!author) {
    return NextResponse.json({ error: 'Автор не найден' }, { status: 400 });
  }

  const readingTime = calculateReadingTime(content);
  let slug = `draft-${Date.now()}`;

  const post = await prisma.blogPost.create({
    data: {
      slug,
      coverImage: coverImage ?? null,
      readingTime,
      authorId: resolvedAuthorId,
      translations: {
        create: {
          locale: 'ru',
          title,
          description,
          content
        }
      },
      ...(categoryIds?.length && {
        categories: {
          create: categoryIds.map(categoryId => ({ categoryId }))
        }
      })
    },
    include: {
      translations: true,
      categories: { include: { category: true } }
    }
  });

  revalidatePath('/', 'layout');

  return NextResponse.json(post, { status: 201 });
}
