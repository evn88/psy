import { NextResponse } from 'next/server';
import { getBackupAuditClientContext, logBackupAuditEvent } from '@/shared/lib/backup/audit';
import { BackupAccessError, requireAdminSession } from '@/shared/lib/backup/auth';
import { normalizeBackupRouteError } from '@/shared/lib/backup/http';
import {
  createBackupJobId,
  createInitialBackupJobSnapshot,
  updateBackupJobSnapshot,
  writeBackupJobSnapshot
} from '@/shared/lib/backup/jobs';
import { startCreateSiteBackupWorkflow } from '@/shared/lib/backup/workflow';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

export const dynamic = 'force-dynamic';

/**
 * Запускает создание полного архива резервной копии.
 */
async function postHandler(request: Request) {
  try {
    const admin = await requireAdminSession({
      route: '/api/admin/backups/create',
      method: 'POST',
      requestHeaders: request.headers
    });

    const jobId = createBackupJobId();
    await writeBackupJobSnapshot(createInitialBackupJobSnapshot(jobId, 'create'));
    const workflowRunId = await startCreateSiteBackupWorkflow(jobId);
    await updateBackupJobSnapshot(jobId, current => ({
      ...current,
      workflowRunId
    }));

    logBackupAuditEvent({
      action: 'backup_create_started',
      userId: admin.userId,
      route: '/api/admin/backups/create',
      method: 'POST',
      statusCode: 202,
      ...getBackupAuditClientContext(request.headers)
    });

    return NextResponse.json(
      {
        jobId
      },
      { status: 202 }
    );
  } catch (error) {
    const normalizedError = normalizeBackupRouteError(
      error,
      'Не удалось запустить создание резервной копии.',
      'BACKUP_CREATE_START_FAILED'
    );

    if (!(error instanceof BackupAccessError)) {
      logBackupAuditEvent({
        action: 'backup_create_failed',
        level: 'error',
        route: '/api/admin/backups/create',
        method: 'POST',
        reason: normalizedError.code,
        statusCode: normalizedError.status,
        ...getBackupAuditClientContext(request.headers)
      });
    }

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
