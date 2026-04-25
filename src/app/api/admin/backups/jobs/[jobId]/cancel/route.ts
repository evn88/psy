import { NextResponse } from 'next/server';
import { getRun } from 'workflow/api';
import { requireAdminSession } from '@/shared/lib/backup/auth';
import { normalizeBackupRouteError } from '@/shared/lib/backup/http';
import { readBackupJobSnapshot, requestBackupJobCancellation } from '@/shared/lib/backup/jobs';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

/**
 * Запрашивает остановку активного задания создания резервной копии.
 */
async function postHandler(request: Request, { params }: RouteContext) {
  try {
    await requireAdminSession({
      route: '/api/admin/backups/jobs/[jobId]/cancel',
      method: 'POST',
      requestHeaders: request.headers
    });

    const { jobId } = await params;
    const snapshot = await readBackupJobSnapshot(jobId);

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Задание не найдено.', code: 'BACKUP_JOB_READ_FAILED' },
        { status: 404 }
      );
    }

    if (snapshot.kind !== 'create') {
      return NextResponse.json(
        {
          error: 'Остановка из интерфейса пока поддерживается только для создания архива.',
          code: 'BACKUP_REQUEST_INVALID'
        },
        { status: 400 }
      );
    }

    const updatedSnapshot = await requestBackupJobCancellation(jobId);

    if (snapshot.workflowRunId) {
      await getRun(snapshot.workflowRunId).cancel();
    }

    return NextResponse.json(updatedSnapshot, { status: 202 });
  } catch (error) {
    const normalizedError = normalizeBackupRouteError(
      error,
      'Не удалось запросить остановку создания архива.',
      'BACKUP_CANCEL_FAILED'
    );

    return NextResponse.json(
      {
        error: normalizedError.message,
        code: normalizedError.code
      },
      { status: normalizedError.status }
    );
  }
}

export const POST = withApiLogging(postHandler);
