/**
 * Константы системы резервного копирования.
 */
export const BACKUP_ARCHIVE_EXTENSION = '.tar.gz';

/** Префикс для архивов БД, созданных вручную из админки. */
export const BACKUP_DATABASE_ARCHIVE_PREFIX = 'system-backups/archives/database';

/** Префикс для теневых архивов БД перед восстановлением. */
export const BACKUP_SHADOW_DATABASE_PREFIX = 'system-backups/shadow/database';

/** Префикс для временно загруженных архивов восстановления. */
export const BACKUP_UPLOAD_PREFIX = 'system-backups/uploads';

/** Префикс для JSON-статусов заданий. */
export const BACKUP_JOB_STATUS_PREFIX = 'system-backups/jobs';

/** Внутренние системные префиксы backup-механизма, не входящие в пользовательские данные blob store. */
export const BACKUP_SYSTEM_PREFIXES = [
  BACKUP_DATABASE_ARCHIVE_PREFIX,
  BACKUP_SHADOW_DATABASE_PREFIX,
  BACKUP_UPLOAD_PREFIX,
  BACKUP_JOB_STATUS_PREFIX
] as const;

/** Максимальный размер архива восстановления для client upload. */
export const MAX_BACKUP_ARCHIVE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 ГБ

/** Базовый интервал опроса активного задания в UI. */
export const BACKUP_JOB_POLL_INTERVAL_MS = 1_500;

/** Интервал опроса задания в очереди. */
export const BACKUP_JOB_QUEUED_POLL_INTERVAL_MS = 4_000;

/** Интервал повторной попытки после ошибки опроса. */
export const BACKUP_JOB_ERROR_POLL_INTERVAL_MS = 6_000;

/** Окно rate limiting для скачивания архивов БД. */
export const BACKUP_DOWNLOAD_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/** Максимум скачиваний архива БД за одно окно rate limiting. */
export const BACKUP_DOWNLOAD_RATE_LIMIT_MAX_REQUESTS = 5;

/** Время жизни client token для загрузки архивов восстановления. */
export const BACKUP_UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Короткий cache-control для файлов статуса. */
export const BACKUP_JOB_STATUS_CACHE_SECONDS = 60;

/** Версия формата manifest.json внутри архива. */
export const BACKUP_MANIFEST_VERSION = 1;

/** MIME-типы, разрешённые для загрузки архива восстановления. */
export const BACKUP_ALLOWED_UPLOAD_TYPES = [
  'application/gzip',
  'application/x-gzip',
  'application/octet-stream'
] as const;

/** Разрешённые расширения файлов архивов восстановления. */
export const BACKUP_ALLOWED_UPLOAD_EXTENSIONS = ['.tar.gz', '.gz'] as const;

/** MIME-тип итогового архива резервной копии. */
export const BACKUP_ARCHIVE_CONTENT_TYPE = 'application/gzip';
