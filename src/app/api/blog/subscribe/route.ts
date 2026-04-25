import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import { z } from 'zod';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const schema = z.object({ email: z.string().email() });

async function postHandler(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверный email' }, { status: 400 });
  }

  const { email } = parsed.data;

  const existing = await prisma.blogSubscription.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'alreadySubscribed' }, { status: 409 });
  }

  await prisma.blogSubscription.create({ data: { email } });

  return NextResponse.json({ success: true });
}

export const POST = withApiLogging(postHandler);
