import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/shared/lib/prisma';
import { sendAccountDeletionRequestEmail } from '@/shared/lib/email';

/**
 * POST handler — отправляет письмо с подтверждением удаления аккаунта.
 * Запрещено для Admin-аккаунтов и пользователей с публикациями блога.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, role: true, language: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Запрет самоудаления для администраторов
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'admin_cannot_self_delete' }, { status: 403 });
    }

    // Запрет если есть публикации блога (onDelete: Restrict)
    const blogPostCount = await prisma.blogPost.count({ where: { authorId: user.id } });
    if (blogPostCount > 0) {
      return NextResponse.json({ error: 'has_blog_posts' }, { status: 409 });
    }

    // Удаляем старый токен если существует
    await prisma.verificationToken.deleteMany({
      where: { identifier: `delete-account:${user.email}` }
    });

    // Создаём токен подтверждения (действует 24 часа)
    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: `delete-account:${user.email}`,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    await sendAccountDeletionRequestEmail({
      to: user.email,
      name: user.name ?? user.email,
      token,
      language: user.language ?? 'ru'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
