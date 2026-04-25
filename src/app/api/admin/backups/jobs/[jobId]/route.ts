import { NextResponse } from 'next/server';
import { BackupAccessError, requireAdminSession } from '@/shared/lib/backup/auth';
import { readBackupJobSnapshot } from '@/shared/lib/backup/jobs';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

/**
 * Возвращает текущее состояние backup/restore задания.
 */
async function getHandler(_request: Request, { params }: RouteContext) {
  try {
    await requireAdminSession();

    const { jobId } = await params;
    const snapshot = await readBackupJobSnapshot(jobId);

    if (!snapshot) {
      return NextResponse.json({ error: 'Задание не найдено.' }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось получить состояние задания.';
    const status = error instanceof BackupAccessError ? error.statusCode : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withApiLogging(getHandler);
