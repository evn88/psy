import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

// POST /api/push/subscribe — сохранить подписку
async function postHandler(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint, p256dh, auth: authKey } = await request.json();

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth: authKey, userId: session.user.id },
    create: { endpoint, p256dh, auth: authKey, userId: session.user.id }
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe — удалить подписку
async function deleteHandler(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await request.json();

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id }
  });

  return NextResponse.json({ success: true });
}

export const POST = withApiLogging(postHandler);
export const DELETE = withApiLogging(deleteHandler);
