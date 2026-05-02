import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import {
  BACKUP_ARCHIVE_EXTENSION,
  BACKUP_DATABASE_ARCHIVE_PREFIX,
  BACKUP_JOB_STATUS_PREFIX,
  BACKUP_SHADOW_DATABASE_PREFIX,
  BACKUP_SYSTEM_PREFIXES,
  BACKUP_UPLOAD_PREFIX
} from '@/lib/config/backup';
import type { BackupArchiveKind } from './types';

/**
 * Преобразует поток в Buffer.
 * @param stream - входной Node.js поток.
 * @returns Полностью собранный буфер.
 */
export const readNodeStreamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

/**
 * Преобразует Web ReadableStream в Buffer.
 * @param stream - входной web-поток.
 * @returns Полностью собранный буфер.
 */
export const readWebStreamToBuffer = async (
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> => {
  return readNodeStreamToBuffer(Readable.fromWeb(stream as unknown as NodeReadableStream));
};

/**
 * Ограничивает прогресс диапазоном от 0 до 100.
 * @param progress - произвольное значение прогресса.
 * @returns Безопасное значение для UI.
 */
export const clampProgress = (progress: number): number => {
  if (Number.isNaN(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(progress)));
};

/**
 * Возвращает безопасное имя файла архива.
 * @param value - исходное имя.
 * @returns Имя файла без опасных символов.
 */
export const sanitizeArchiveBaseName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

/**
 * Создаёт имя архива резервной копии.
 * @param kind - тип архива.
 * @returns Имя файла с расширением `.tar.gz`.
 */
export const createBackupArchiveFileName = (kind: BackupArchiveKind): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = kind === 'shadow' ? 'shadow-database-backup' : 'site-database-backup';

  return `${prefix}-${timestamp}${BACKUP_ARCHIVE_EXTENSION}`;
};

/**
 * Возвращает pathname для итогового архива в private blob.
 * @param kind - тип архива.
 * @param fileName - итоговое имя файла.
 * @returns Полный pathname внутри blob store.
 */
export const createArchivePathname = (kind: BackupArchiveKind, fileName: string): string => {
  const prefix = kind === 'shadow' ? BACKUP_SHADOW_DATABASE_PREFIX : BACKUP_DATABASE_ARCHIVE_PREFIX;

  return `${prefix}/${fileName}`;
};

/**
 * Возвращает pathname для временной загрузки архива восстановления.
 * @param fileName - имя файла архива.
 * @returns Путь внутри private blob.
 */
export const createUploadPathname = (fileName: string): string => {
  return `${BACKUP_UPLOAD_PREFIX}/${fileName}`;
};

/**
 * Возвращает pathname JSON-статуса задания.
 * @param jobId - идентификатор задания.
 * @returns Путь до JSON-файла состояния.
 */
export const createJobStatusPathname = (jobId: string): string => {
  return `${BACKUP_JOB_STATUS_PREFIX}/${jobId}/status.json`;
};

/**
 * Проверяет, относится ли pathname к служебным backup-файлам системы.
 * @param pathname - путь blob-объекта.
 * @returns `true`, если это внутренний системный файл backup-механизма.
 */
export const isSystemBackupPathname = (pathname: string): boolean => {
  return BACKUP_SYSTEM_PREFIXES.some(prefix => pathname.startsWith(`${prefix}/`));
};

/**
 * Экранирует SQL-идентификатор таблицы или колонки.
 * @param identifier - исходное имя.
 * @returns Экранированный идентификатор.
 */
export const escapeSqlIdentifier = (identifier: string): string => {
  return `"${identifier.replace(/"/g, '""')}"`;
};

/**
 * Рекурсивно заменяет строковые blob URL по карте соответствий.
 * @param value - произвольное значение.
 * @param urlMap - отображение `старый URL -> новый URL`.
 * @returns Значение с подменёнными URL.
 */
export const replaceBlobUrlsDeep = (
  value: unknown,
  urlMap: ReadonlyMap<string, string>
): unknown => {
  if (typeof value === 'string') {
    return urlMap.get(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map(item => replaceBlobUrlsDeep(item, urlMap));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        replaceBlobUrlsDeep(entryValue, urlMap)
      ])
    );
  }

  return value;
};
