import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  title: z.any(), // Record<string, string> expected
  description: z.any().optional(), // Record<string, string> expected
  amount: z.number(),
  currency: z.string().default('EUR'),
  coverImage: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  order: z.number().default(0)
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const packages = await prisma.servicePackage.findMany({
    orderBy: { order: 'asc' }
  });

  return NextResponse.json({ packages });
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

  const { title, description, amount, currency, coverImage, isActive, order } = parsed.data;

  const pkg = await prisma.servicePackage.create({
    data: {
      title,
      description: description ?? null,
      amount,
      currency,
      coverImage: coverImage ?? null,
      isActive,
      order
    }
  });

  revalidatePath('/my/payments', 'page');
  revalidatePath('/[locale]/(main)/my/payments', 'page');

  return NextResponse.json(pkg, { status: 201 });
}
