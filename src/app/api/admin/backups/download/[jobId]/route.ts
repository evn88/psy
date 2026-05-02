import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBackupAuditClientContext, logBackupAuditEvent } from '@/modules/backup/audit';
import { BackupAccessError, requireAdminSession } from '@/modules/backup/auth';
import { getBackupBlobStream } from '@/modules/backup/blob';
import { normalizeBackupRouteError } from '@/modules/backup/http';
import { readBackupJobSnapshot } from '@/modules/backup/jobs';
import { consumeBackupDownloadRateLimit } from '@/modules/backup/rate-limit';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

export const dynamic = 'force-dynamic';

const routeParamsSchema = z.object({
  jobId: z.uuid('Некорректный идентификатор задания.')
});

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

/**
 * Отдаёт созданный архив БД на скачивание.
 */
async function getHandler(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdminSession({
      route: '/api/admin/backups/download/[jobId]',
      method: 'GET',
      requestHeaders: request.headers
    });

    const parsedParams = routeParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      logBackupAuditEvent({
        action: 'backup_download_rejected',
        level: 'warn',
        userId: admin.userId,
        route: '/api/admin/backups/download/[jobId]',
        method: 'GET',
        reason: 'BACKUP_REQUEST_INVALID',
        statusCode: 400,
        ...getBackupAuditClientContext(request.headers)
      });

      return NextResponse.json(
        {
          error: parsedParams.error.issues[0]?.message ?? 'Некорректный идентификатор задания.',
          code: 'BACKUP_REQUEST_INVALID'
        },
        { status: 400 }
      );
    }

    const { jobId } = parsedParams.data;
    const clientContext = getBackupAuditClientContext(request.headers);
    const rateLimitKey = `${admin.userId}:${clientContext.ip ?? 'unknown-ip'}:backup-download`;
    const rateLimit = consumeBackupDownloadRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      logBackupAuditEvent({
        action: 'backup_download_rate_limited',
        level: 'warn',
        userId: admin.userId,
        jobId,
        route: '/api/admin/backups/download/[jobId]',
        method: 'GET',
        reason: 'BACKUP_DOWNLOAD_RATE_LIMITED',
        statusCode: 429,
        ...clientContext
      });

      return NextResponse.json(
        {
          error: 'Слишком много запросов на скачивание архива. Повторите позже.',
          code: 'BACKUP_DOWNLOAD_RATE_LIMITED'
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds)
          }
        }
      );
    }

    const snapshot = await readBackupJobSnapshot(jobId);
    const archivePathname = snapshot?.databaseArchivePathname;
    const archiveFileName = snapshot?.databaseArchiveFileName;

    if (!archivePathname || !archiveFileName) {
      logBackupAuditEvent({
        action: 'backup_download_rejected',
        level: 'warn',
        userId: admin.userId,
        jobId,
        route: '/api/admin/backups/download/[jobId]',
        method: 'GET',
        reason: 'BACKUP_JOB_READ_FAILED',
        statusCode: 404,
        ...clientContext
      });

      return NextResponse.json(
        { error: 'Архив БД для задания ещё не готов.', code: 'BACKUP_JOB_READ_FAILED' },
        { status: 404 }
      );
    }

    const archiveBlob = await getBackupBlobStream('private', archivePathname);
    const encodedFileName = encodeURIComponent(archiveFileName);

    logBackupAuditEvent({
      action: 'backup_download_started',
      userId: admin.userId,
      jobId,
      fileName: archiveFileName,
      fileSize: archiveBlob.size,
      route: '/api/admin/backups/download/[jobId]',
      method: 'GET',
      statusCode: 200,
      ...clientContext
    });

    return new NextResponse(Readable.toWeb(archiveBlob.stream as Readable) as ReadableStream, {
      headers: {
        'Content-Type': archiveBlob.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const normalizedError = normalizeBackupRouteError(
      error,
      'Не удалось скачать архив резервной копии.',
      'BACKUP_DOWNLOAD_FAILED'
    );

    if (!(error instanceof BackupAccessError)) {
      logBackupAuditEvent({
        action: 'backup_download_failed',
        level: 'error',
        route: '/api/admin/backups/download/[jobId]',
        method: 'GET',
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

export const GET = withApiLogging(getHandler);
