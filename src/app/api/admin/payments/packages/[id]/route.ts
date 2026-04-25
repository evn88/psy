import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { z } from 'zod';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const updateSchema = z.object({
  title: z.any().optional(),
  description: z.any().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  coverImage: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional()
});

async function putHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;
  const body = await req.json();

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Неверные данные', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.servicePackage.update({
      where: { id },
      data: parsed.data
    });
    revalidatePath('/my/payments', 'page');
    revalidatePath('/[locale]/(main)/my/payments', 'page');
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

async function deleteHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    await prisma.servicePackage.delete({
      where: { id }
    });
    revalidatePath('/my/payments', 'page');
    revalidatePath('/[locale]/(main)/my/payments', 'page');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}

export const PUT = withApiLogging(putHandler);
export const DELETE = withApiLogging(deleteHandler);
