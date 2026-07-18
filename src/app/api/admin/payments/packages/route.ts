import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

const localizedTextSchema = z.record(z.string(), z.string().trim().max(500));

const createSchema = z.object({
  title: localizedTextSchema.refine(
    value => Boolean(value.ru?.trim()),
    'Russian title is required'
  ),
  description: localizedTextSchema.optional(),
  amount: z.number().positive().max(999_999),
  currency: z.literal('EUR').default('EUR'),
  includedMinutes: z.number().int().min(15).max(100_000),
  coverImage: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

async function getHandler(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const packages = await prisma.servicePackage.findMany({
    orderBy: { order: 'asc' }
  });

  return NextResponse.json({ packages });
}

async function postHandler(req: Request) {
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

  const { title, description, amount, currency, includedMinutes, coverImage, isActive, order } =
    parsed.data;

  const pkg = await prisma.servicePackage.create({
    data: {
      title,
      description: description ?? null,
      amount,
      currency,
      includedMinutes,
      coverImage: coverImage ?? null,
      isActive,
      order
    }
  });

  revalidatePath('/my/payments', 'page');
  revalidatePath('/[locale]/(dashboard)/my/payments', 'page');

  return NextResponse.json(pkg, { status: 201 });
}

export const GET = withApiLogging(getHandler);
export const POST = withApiLogging(postHandler);
