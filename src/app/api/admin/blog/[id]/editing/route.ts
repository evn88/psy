import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  acquireBlogEditorLock,
  BLOG_EDITOR_LOCK_TTL_MS,
  getBlogEditorLockState,
  releaseBlogEditorLock
} from '@/shared/lib/blog-editor-lock-store';

const editorLockSchema = z.object({
  instanceId: z.string().min(1)
});

/**
 * Формирует ответ о состоянии блокировки редактора статьи.
 *
 * @param state Состояние блокировки.
 * @returns JSON-ответ для клиента.
 */
const buildLockResponse = (state: ReturnType<typeof getBlogEditorLockState>) => {
  return NextResponse.json({
    isLockedByOther: !!state.owner && !state.isOwner,
    owner: state.owner
      ? {
          userId: state.owner.userId,
          userName: state.owner.userName
        }
      : null,
    ttlMs: BLOG_EDITOR_LOCK_TTL_MS
  });
};

/**
 * Проверяет права администратора для редактирования статьи.
 *
 * @returns Сессию администратора или `null`.
 */
const requireAdmin = async () => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN' || !session.user.id) {
    return null;
  }

  return session;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const parsed = editorLockSchema.safeParse({
    instanceId: searchParams.get('instanceId') ?? ''
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid editor instance' }, { status: 400 });
  }

  return buildLockResponse(getBlogEditorLockState(id, parsed.data.instanceId));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = editorLockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid editor instance' }, { status: 400 });
  }

  const state = acquireBlogEditorLock({
    postId: id,
    instanceId: parsed.data.instanceId,
    userId: session.user.id!,
    userName: session.user.name ?? session.user.email ?? 'Admin'
  });

  return buildLockResponse(state);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = editorLockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid editor instance' }, { status: 400 });
  }

  releaseBlogEditorLock(id, parsed.data.instanceId);

  return NextResponse.json({ success: true });
}
