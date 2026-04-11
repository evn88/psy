import { BackupAccessError } from './auth';

export type BackupRouteErrorCode =
  | 'BACKUP_ACCESS_DENIED'
  | 'BACKUP_CREATE_START_FAILED'
  | 'BACKUP_RESTORE_START_FAILED'
  | 'BACKUP_UPLOAD_PATH_INVALID'
  | 'BACKUP_UPLOAD_TYPE_INVALID'
  | 'BACKUP_UPLOAD_SIZE_EXCEEDED'
  | 'BACKUP_DOWNLOAD_RATE_LIMITED'
  | 'BACKUP_REQUEST_INVALID'
  | 'BACKUP_DOWNLOAD_FAILED'
  | 'BACKUP_JOB_READ_FAILED'
  | 'BACKUP_CANCEL_FAILED'
  | 'BACKUP_UPLOAD_FAILED';

export type BackupRouteErrorPayload = {
  code: BackupRouteErrorCode;
  message: string;
  status: number;
};

/**
 * Возвращает HTTP-статус по коду ошибки backup-route.
 * @param code - код ошибки.
 * @returns Подходящий HTTP-статус.
 */
const getBackupRouteErrorStatus = (code: BackupRouteErrorCode): number => {
  if (
    code === 'BACKUP_REQUEST_INVALID' ||
    code === 'BACKUP_UPLOAD_PATH_INVALID' ||
    code === 'BACKUP_CANCEL_FAILED'
  ) {
    return 400;
  }

  if (code === 'BACKUP_UPLOAD_TYPE_INVALID') {
    return 415;
  }

  if (code === 'BACKUP_UPLOAD_SIZE_EXCEEDED') {
    return 413;
  }

  if (code === 'BACKUP_DOWNLOAD_RATE_LIMITED') {
    return 429;
  }

  return 500;
};

/**
 * Нормализует ошибку backup-route в безопасный HTTP payload.
 * @param error - исходная ошибка.
 * @param fallbackMessage - сообщение по умолчанию.
 * @param fallbackCode - код по умолчанию.
 * @returns Нормализованные статус, код и текст ошибки.
 */
export const normalizeBackupRouteError = (
  error: unknown,
  fallbackMessage: string,
  fallbackCode: BackupRouteErrorCode
): BackupRouteErrorPayload => {
  if (error instanceof BackupAccessError) {
    return {
      code: 'BACKUP_ACCESS_DENIED',
      message: error.message,
      status: error.statusCode
    };
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      status: getBackupRouteErrorStatus(fallbackCode)
    };
  }

  return {
    code: fallbackCode,
    message: fallbackMessage,
    status: getBackupRouteErrorStatus(fallbackCode)
  };
};
