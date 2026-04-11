import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import {
  BACKUP_ALLOWED_UPLOAD_EXTENSIONS,
  BACKUP_ALLOWED_UPLOAD_TYPES,
  BACKUP_UPLOAD_PREFIX,
  BACKUP_UPLOAD_TOKEN_TTL_MS,
  MAX_BACKUP_ARCHIVE_SIZE_BYTES
} from '@/configs/backup';
import { deleteBackupBlobs } from '@/shared/lib/backup/blob';
import { getBackupAuditClientContext, logBackupAuditEvent } from '@/shared/lib/backup/audit';
import { BackupAccessError, requireAdminSession } from '@/shared/lib/backup/auth';
import { type BackupRouteErrorCode, normalizeBackupRouteError } from '@/shared/lib/backup/http';

export const dynamic = 'force-dynamic';

type BackupUploadClientPayload = {
  fileName: string;
  fileSize: number;
  contentType: string | null;
};

/**
 * Проверяет, что имя файла имеет допустимое архивное расширение.
 * @param value - исходное имя файла или pathname.
 * @returns `true`, если расширение поддерживается.
 */
const isAllowedArchiveFileName = (value: string): boolean => {
  const normalizedValue = value.trim().toLowerCase();

  return BACKUP_ALLOWED_UPLOAD_EXTENSIONS.some(extension => normalizedValue.endsWith(extension));
};

/**
 * Создаёт typed-ошибку валидации загрузки.
 * @param code - код ошибки.
 * @param message - человекочитаемое сообщение.
 * @returns Ошибка с сохранённым кодом.
 */
const createUploadValidationError = (
  code: BackupRouteErrorCode,
  message: string
): Error & {
  code: BackupRouteErrorCode;
} => {
  const error = new Error(message) as Error & {
    code: BackupRouteErrorCode;
  };

  error.code = code;
  return error;
};

/**
 * Возвращает код ошибки upload-валидации, если он был задан явно.
 * @param error - исходная ошибка.
 * @returns Код ошибки либо `undefined`.
 */
const getUploadValidationErrorCode = (error: unknown): BackupRouteErrorCode | undefined => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: BackupRouteErrorCode }).code;
  }

  return undefined;
};

/**
 * Разбирает клиентский payload загрузки архива.
 * @param rawPayload - строка payload от клиента.
 * @returns Нормализованные метаданные файла.
 */
const parseUploadClientPayload = (rawPayload: string | null): BackupUploadClientPayload => {
  if (!rawPayload) {
    throw createUploadValidationError(
      'BACKUP_REQUEST_INVALID',
      'В запросе на загрузку отсутствуют метаданные архива.'
    );
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    throw createUploadValidationError(
      'BACKUP_REQUEST_INVALID',
      'Метаданные архива не удалось прочитать.'
    );
  }

  if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
    throw createUploadValidationError(
      'BACKUP_REQUEST_INVALID',
      'Метаданные архива имеют неверный формат.'
    );
  }

  const { fileName, fileSize, contentType } = parsedPayload as Record<string, unknown>;

  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw createUploadValidationError(
      'BACKUP_REQUEST_INVALID',
      'В метаданных архива отсутствует имя файла.'
    );
  }

  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
    throw createUploadValidationError(
      'BACKUP_REQUEST_INVALID',
      'В метаданных архива отсутствует корректный размер файла.'
    );
  }

  if (contentType !== null && typeof contentType !== 'string') {
    throw createUploadValidationError(
      'BACKUP_REQUEST_INVALID',
      'В метаданных архива передан некорректный MIME-тип.'
    );
  }

  return {
    fileName: fileName.trim(),
    fileSize,
    contentType: contentType?.trim() || null
  };
};

/**
 * Проверяет pathname и метаданные архива до выдачи upload-token.
 * @param pathname - путь назначения в blob store.
 * @param clientPayload - клиентские метаданные файла.
 */
const validateUploadRequest = (
  pathname: string,
  clientPayload: BackupUploadClientPayload
): void => {
  if (!pathname.startsWith(`${BACKUP_UPLOAD_PREFIX}/database/`)) {
    throw createUploadValidationError(
      'BACKUP_UPLOAD_PATH_INVALID',
      'Разрешена загрузка только в системный upload prefix для архивов БД.'
    );
  }

  if (!isAllowedArchiveFileName(pathname) || !isAllowedArchiveFileName(clientPayload.fileName)) {
    throw createUploadValidationError(
      'BACKUP_UPLOAD_PATH_INVALID',
      'Поддерживаются только архивы с расширением .tar.gz или .gz.'
    );
  }

  if (clientPayload.fileSize > MAX_BACKUP_ARCHIVE_SIZE_BYTES) {
    throw createUploadValidationError(
      'BACKUP_UPLOAD_SIZE_EXCEEDED',
      'Размер архива превышает допустимый лимит.'
    );
  }

  if (
    clientPayload.contentType &&
    !BACKUP_ALLOWED_UPLOAD_TYPES.includes(
      clientPayload.contentType as (typeof BACKUP_ALLOWED_UPLOAD_TYPES)[number]
    )
  ) {
    throw createUploadValidationError(
      'BACKUP_UPLOAD_TYPE_INVALID',
      'Поддерживаются только gzip-архивы резервной копии.'
    );
  }
};

/**
 * Генерирует client token для загрузки архивов восстановления напрямую в private blob.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession({
      route: '/api/admin/backups/upload',
      method: 'POST',
      requestHeaders: request.headers
    });

    const body = (await request.json()) as HandleUploadBody;

    const json = await handleUpload({
      request,
      body,
      token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, rawClientPayload) => {
        const clientPayload = parseUploadClientPayload(rawClientPayload);

        validateUploadRequest(pathname, clientPayload);

        return {
          allowedContentTypes: [...BACKUP_ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_BACKUP_ARCHIVE_SIZE_BYTES,
          validUntil: Date.now() + BACKUP_UPLOAD_TOKEN_TTL_MS,
          tokenPayload: rawClientPayload,
          addRandomSuffix: false,
          allowOverwrite: true
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const clientPayload = parseUploadClientPayload(tokenPayload ?? null);

        validateUploadRequest(blob.pathname, clientPayload);

        if (
          !BACKUP_ALLOWED_UPLOAD_TYPES.includes(
            blob.contentType as (typeof BACKUP_ALLOWED_UPLOAD_TYPES)[number]
          )
        ) {
          await deleteBackupBlobs('private', [blob.pathname]);
          throw createUploadValidationError(
            'BACKUP_UPLOAD_TYPE_INVALID',
            'Загруженный архив имеет неподдерживаемый MIME-тип.'
          );
        }
      }
    });

    if (json.type === 'blob.generate-client-token') {
      logBackupAuditEvent({
        action: 'backup_upload_token_generated',
        userId: admin.userId,
        route: '/api/admin/backups/upload',
        method: 'POST',
        statusCode: 200,
        ...getBackupAuditClientContext(request.headers)
      });
    }

    return NextResponse.json(json);
  } catch (error) {
    const explicitCode = getUploadValidationErrorCode(error);
    const normalizedError = normalizeBackupRouteError(
      error,
      'Не удалось подготовить загрузку архива.',
      explicitCode ?? 'BACKUP_UPLOAD_FAILED'
    );

    if (!(error instanceof BackupAccessError)) {
      logBackupAuditEvent({
        action: 'backup_upload_failed',
        level: 'warn',
        route: '/api/admin/backups/upload',
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
