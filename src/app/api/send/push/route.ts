import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { sendPushToMany } from '@/shared/lib/push';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

async function postHandler(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { to, sendToAll, title, message } = await request.json();

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
  }

  let subscriptions: {
    endpoint: string;
    p256dh: string;
    auth: string;
    user: { email: string | null };
  }[];

  if (sendToAll) {
    subscriptions = await prisma.pushSubscription.findMany({
      select: { endpoint: true, p256dh: true, auth: true, user: { select: { email: true } } }
    });
  } else {
    if (!Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Не выбраны получатели' }, { status: 400 });
    }
    subscriptions = await prisma.pushSubscription.findMany({
      where: { user: { email: { in: to } } },
      select: { endpoint: true, p256dh: true, auth: true, user: { select: { email: true } } }
    });
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({
      results: [],
      message: 'Нет активных push-подписок у выбранных пользователей'
    });
  }

  const results = await sendPushToMany(subscriptions, {
    title: typeof title === 'string' && title.trim() ? title.trim() : undefined,
    body: message.trim()
  });

  // Добавим email к каждому результату
  const enriched = results.map(r => {
    const sub = subscriptions.find(s => s.endpoint === r.endpoint);
    return { email: sub?.user?.email ?? r.endpoint, success: r.success, error: r.error };
  });

  return NextResponse.json({ results: enriched });
}

export const POST = withApiLogging(postHandler);
