import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

const MAX_VERSIONS = 5;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') return null;
  return session;
}

// GET /api/admin/blog/[id]/versions — получить последние 5 версий
async function getHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const versions = await prisma.blogPostVersion.findMany({
    where: { postId: id },
    orderBy: { savedAt: 'desc' },
    take: MAX_VERSIONS
  });

  return NextResponse.json(versions);
}

// POST /api/admin/blog/[id]/versions — создать снапшот (только при ручном сохранении)
async function postHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { translations, categoryIds, coverImage } = body;

  // Создаём версию
  const version = await prisma.blogPostVersion.create({
    data: {
      postId: id,
      translations: translations ?? [],
      categoryIds: categoryIds ?? [],
      coverImage: coverImage ?? null
    }
  });

  // Удаляем старые версии — оставляем только MAX_VERSIONS
  const allVersions = await prisma.blogPostVersion.findMany({
    where: { postId: id },
    orderBy: { savedAt: 'desc' },
    select: { id: true }
  });

  if (allVersions.length > MAX_VERSIONS) {
    const toDelete = allVersions.slice(MAX_VERSIONS).map((v: { id: string }) => v.id);
    await prisma.blogPostVersion.deleteMany({ where: { id: { in: toDelete } } });
  }

  return NextResponse.json(version, { status: 201 });
}

export const GET = withApiLogging(getHandler);
export const POST = withApiLogging(postHandler);
