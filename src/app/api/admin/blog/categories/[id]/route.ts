import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  nameRu: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  nameSr: z.string().optional()
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  }

  const existing = await prisma.blogCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });

  const currentName = existing.name as Record<string, string>;
  const { nameRu, nameEn, nameSr } = parsed.data;

  const updated = await prisma.blogCategory.update({
    where: { id },
    data: {
      name: {
        ru: nameRu ?? currentName.ru,
        en: nameEn ?? currentName.en,
        sr: nameSr ?? currentName.sr
      }
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await prisma.blogCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
