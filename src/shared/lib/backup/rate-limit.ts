import {
  BACKUP_DOWNLOAD_RATE_LIMIT_MAX_REQUESTS,
  BACKUP_DOWNLOAD_RATE_LIMIT_WINDOW_MS
} from '@/configs/backup';

type RateLimitBucket = {
  requestTimestamps: number[];
};

const backupRateLimitStore = globalThis as typeof globalThis & {
  __backupRateLimitStore?: Map<string, RateLimitBucket>;
};

const getRateLimitStore = (): Map<string, RateLimitBucket> => {
  if (!backupRateLimitStore.__backupRateLimitStore) {
    backupRateLimitStore.__backupRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return backupRateLimitStore.__backupRateLimitStore;
};

/**
 * Проверяет и обновляет process-local rate limit для скачивания архивов.
 * @param key - уникальный ключ пользователя или клиента.
 * @returns Информация о текущем лимите и необходимости блокировки.
 */
export const consumeBackupDownloadRateLimit = (
  key: string
): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} => {
  const now = Date.now();
  const windowStartedAt = now - BACKUP_DOWNLOAD_RATE_LIMIT_WINDOW_MS;
  const store = getRateLimitStore();
  const bucket = store.get(key) ?? {
    requestTimestamps: []
  };

  bucket.requestTimestamps = bucket.requestTimestamps.filter(
    timestamp => timestamp > windowStartedAt
  );

  if (bucket.requestTimestamps.length >= BACKUP_DOWNLOAD_RATE_LIMIT_MAX_REQUESTS) {
    const oldestTimestamp = bucket.requestTimestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestTimestamp + BACKUP_DOWNLOAD_RATE_LIMIT_WINDOW_MS - now) / 1000)
    );

    store.set(key, bucket);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  bucket.requestTimestamps.push(now);
  store.set(key, bucket);

  return {
    allowed: true,
    remaining: Math.max(
      BACKUP_DOWNLOAD_RATE_LIMIT_MAX_REQUESTS - bucket.requestTimestamps.length,
      0
    ),
    retryAfterSeconds: 0
  };
};
