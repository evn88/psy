import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Токен не указан' }, { status: 400 });
  }

  const subscription = await prisma.blogSubscription.findFirst({ where: { token } });
  if (!subscription) {
    return NextResponse.redirect(new URL('/blog?unsubscribed=not_found', req.url));
  }

  await prisma.blogSubscription.delete({ where: { id: subscription.id } });

  return NextResponse.redirect(new URL('/blog?unsubscribed=true', req.url));
}
