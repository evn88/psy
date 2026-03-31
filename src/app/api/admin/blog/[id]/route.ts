import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { calculateReadingTime } from '@/shared/lib/blog-utils';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const updateSchema = z.object({
  coverImage: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  translations: z
    .array(
      z.object({
        locale: z.string(),
        title: z.string().min(1),
        description: z.string(),
        content: z.string()
      })
    )
    .optional()
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      translations: true,
      categories: { include: { category: true } }
    }
  });

  if (!post) {
    return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Неверные данные', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { coverImage, categoryIds, status, translations } = parsed.data;

  // Пересчитываем время чтения по русской версии
  const ruTranslation = translations?.find((t: { locale: string }) => t.locale === 'ru');
  const readingTime = ruTranslation ? calculateReadingTime(ruTranslation.content) : undefined;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.blogPost.update({
      where: { id },
      data: {
        ...(coverImage !== undefined && { coverImage }),
        ...(readingTime !== undefined && { readingTime }),
        ...(status !== undefined && { status }),
        // При переводе в черновик сбрасываем publishedAt
        ...(status === 'DRAFT' && { publishedAt: null })
      }
    });

    if (translations) {
      for (const translation of translations) {
        await tx.blogPostTranslation.upsert({
          where: { postId_locale: { postId: id, locale: translation.locale } },
          create: { postId: id, ...translation },
          update: {
            title: translation.title,
            description: translation.description,
            content: translation.content
          }
        });
      }
    }

    if (categoryIds !== undefined) {
      await tx.blogPostCategory.deleteMany({ where: { postId: id } });
      if (categoryIds.length > 0) {
        await tx.blogPostCategory.createMany({
          data: categoryIds.map(categoryId => ({ postId: id, categoryId }))
        });
      }
    }
  });

  const updated = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      translations: true,
      categories: { include: { category: true } }
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  await prisma.blogPost.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
