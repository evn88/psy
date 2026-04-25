import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { generateSlug } from '@/shared/lib/blog-utils';
import { z } from 'zod';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const createSchema = z.object({
  nameRu: z.string().min(1),
  nameEn: z.string().optional(),
  nameSr: z.string().optional()
});

async function getHandler() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { createdAt: 'asc' },
    include: { posts: { select: { postId: true } } }
  });
  return NextResponse.json(categories);
}

async function postHandler(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  }

  const { nameRu, nameEn, nameSr } = parsed.data;
  const slug = generateSlug(nameRu);

  const category = await prisma.blogCategory.create({
    data: {
      slug,
      name: {
        ru: nameRu,
        en: nameEn ?? nameRu,
        sr: nameSr ?? nameRu
      }
    }
  });

  return NextResponse.json(category, { status: 201 });
}

export const GET = withApiLogging(getHandler);
export const POST = withApiLogging(postHandler);
