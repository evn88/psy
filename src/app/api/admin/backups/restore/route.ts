import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BACKUP_DATABASE_ARCHIVE_PREFIX,
  BACKUP_SHADOW_DATABASE_PREFIX,
  BACKUP_UPLOAD_PREFIX
} from '@/configs/backup';
import { requireAdminSession } from '@/shared/lib/backup/auth';
import { normalizeBackupRouteError } from '@/shared/lib/backup/http';
import {
  createBackupJobId,
  createInitialBackupJobSnapshot,
  updateBackupJobSnapshot,
  writeBackupJobSnapshot
} from '@/shared/lib/backup/jobs';
import { startRestoreSiteBackupWorkflow } from '@/shared/lib/backup/workflow';

export const dynamic = 'force-dynamic';

const restoreRequestSchema = z.object({
  databaseArchivePathname: z.string().min(1),
  databaseArchiveFileName: z.string().min(1).optional()
});

/**
 * Проверяет, что путь архива относится к разрешённым системным backup-префиксам.
 * @param pathname - путь blob-файла.
 * @returns `true`, если архив разрешён для восстановления.
 */
const isAllowedArchivePathname = (pathname: string): boolean => {
  return (
    pathname.startsWith(`${BACKUP_UPLOAD_PREFIX}/`) ||
    pathname.startsWith(`${BACKUP_DATABASE_ARCHIVE_PREFIX}/`) ||
    pathname.startsWith(`${BACKUP_SHADOW_DATABASE_PREFIX}/`)
  );
};

/**
 * Запускает durable workflow восстановления БД из архива.
 */
export async function POST(request: Request) {
  try {
    await requireAdminSession({
      route: '/api/admin/backups/restore',
      method: 'POST',
      requestHeaders: request.headers
    });

    const parsed = restoreRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Некорректные данные для восстановления.',
          code: 'BACKUP_REQUEST_INVALID'
        },
        { status: 400 }
      );
    }

    if (!isAllowedArchivePathname(parsed.data.databaseArchivePathname)) {
      return NextResponse.json(
        {
          error: 'Архив БД должен находиться в системном backup blob prefix.',
          code: 'BACKUP_REQUEST_INVALID'
        },
        { status: 400 }
      );
    }

    const jobId = createBackupJobId();
    await writeBackupJobSnapshot({
      ...createInitialBackupJobSnapshot(jobId, 'restore'),
      sourceDatabaseUploadPathname: parsed.data.databaseArchivePathname,
      sourceDatabaseUploadFileName: parsed.data.databaseArchiveFileName
    });

    const workflowRunId = await startRestoreSiteBackupWorkflow({
      jobId,
      databaseArchivePathname: parsed.data.databaseArchivePathname,
      databaseArchiveFileName: parsed.data.databaseArchiveFileName
    });

    await updateBackupJobSnapshot(jobId, current => ({
      ...current,
      workflowRunId
    }));

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    const normalizedError = normalizeBackupRouteError(
      error,
      'Не удалось запустить восстановление БД из архива.',
      'BACKUP_RESTORE_START_FAILED'
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
