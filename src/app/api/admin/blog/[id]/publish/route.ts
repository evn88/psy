import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { acquireBlogEditorLock } from '@/shared/lib/blog-editor-lock-store';
import { sendBlogNotificationEmail } from '@/shared/lib/email';
import { publishToTelegramChannel, publishToTelegraph } from '@/shared/lib/social-publish';
import type { BlogPostTranslation } from '@prisma/client';

const publishSchema = z.object({
  editorInstanceId: z.string().min(1).optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = publishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  }

  if (parsed.data.editorInstanceId) {
    const lockState = acquireBlogEditorLock({
      postId: id,
      instanceId: parsed.data.editorInstanceId,
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

  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      translations: true,
      categories: { include: { category: true } },
      author: { select: { id: true, name: true, image: true } }
    }
  });

  if (!post) {
    return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
  }

  const ruTranslation = (post.translations as BlogPostTranslation[]).find(
    (translation: BlogPostTranslation) => translation.locale === 'ru'
  );
  if (!ruTranslation) {
    return NextResponse.json({ error: 'Русский перевод не найден' }, { status: 400 });
  }

  const published = await prisma.blogPost.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date() }
  });

  // Получаем всех подписчиков (зарегистрированные + анонимные)
  const [registeredUsers, anonymousSubscribers] = await Promise.all([
    prisma.user.findMany({
      where: { blogNotifications: true, isDisabled: false },
      select: { email: true, name: true, language: true }
    }),
    prisma.blogSubscription.findMany({ select: { email: true, token: true } })
  ]);

  // Дедупликация по email
  const registeredEmails = new Set(registeredUsers.map((u: { email: string }) => u.email));
  const allSubscribers = [
    ...registeredUsers.map(
      (u: { email: string; name: string | null; language: string | null }) => ({
        email: u.email,
        name: u.name ?? undefined,
        locale: u.language ?? 'ru',
        unsubscribeToken: undefined as string | undefined
      })
    ),
    ...anonymousSubscribers
      .filter((s: { email: string }) => !registeredEmails.has(s.email))
      .map((s: { email: string; token: string }) => ({
        email: s.email,
        name: undefined as string | undefined,
        locale: 'ru',
        unsubscribeToken: s.token
      }))
  ];

  // Отправляем уведомления асинхронно
  await sendBlogNotificationEmail(published, ruTranslation, allSubscribers);

  // Публикуем в социальные сети (заглушки)
  await Promise.allSettled([
    publishToTelegraph(published, ruTranslation),
    publishToTelegramChannel(published, ruTranslation)
  ]);

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/', 'layout');

  return NextResponse.json({ success: true, publishedAt: published.publishedAt });
}
