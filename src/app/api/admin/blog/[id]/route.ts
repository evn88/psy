import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { acquireBlogEditorLock } from '@/lib/blog-editor-lock-store';
import { calculateReadingTime } from '@/lib/blog-utils';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  coverImage: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  authorId: z.string().min(1).optional(),
  editorInstanceId: z.string().min(1).optional(),
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

async function getHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

async function putHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();

  if (!session) {
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

  const { coverImage, categoryIds, status, translations, authorId, slug, editorInstanceId } =
    parsed.data;

  if (editorInstanceId) {
    const lockState = acquireBlogEditorLock({
      postId: id,
      instanceId: editorInstanceId,
      userId: session.user.id!,
      userName: session.user.name ?? session.user.email ?? 'Admin'
    });

    if (!lockState.isOwner) {
      return NextResponse.json(
        {
          error: 'Эта статья сейчас редактируется в другом окне или другим администратором.'
        },
        { status: 409 }
      );
    }
  }

  if (authorId !== undefined) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true }
    });

    if (!author) {
      return NextResponse.json({ error: 'Автор не найден' }, { status: 400 });
    }
  }

  if (slug !== undefined) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Slug уже используется' }, { status: 400 });
    }
  }

  // Пересчитываем время чтения по русской версии
  const ruTranslation = translations?.find((t: { locale: string }) => t.locale === 'ru');
  const readingTime = ruTranslation ? calculateReadingTime(ruTranslation.content) : undefined;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.blogPost.update({
      where: { id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(coverImage !== undefined && { coverImage }),
        ...(authorId !== undefined && { authorId }),
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

  revalidatePath('/', 'layout');

  return NextResponse.json(updated);
}

async function deleteHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  await prisma.blogPost.delete({ where: { id } });

  revalidatePath('/', 'layout');

  return NextResponse.json({ success: true });
}

export const GET = withApiLogging(getHandler);
export const PUT = withApiLogging(putHandler);
export const DELETE = withApiLogging(deleteHandler);
