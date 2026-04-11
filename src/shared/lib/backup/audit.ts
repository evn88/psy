type BackupAuditLevel = 'info' | 'warn' | 'error';

type BackupAuditEvent = {
  action: string;
  level?: BackupAuditLevel;
  userId?: string | null;
  jobId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  route?: string;
  method?: string;
  reason?: string;
  statusCode?: number;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Возвращает IP-адрес из заголовков прокси.
 * @param requestHeaders - набор HTTP-заголовков.
 * @returns Первый доступный IP-адрес либо `null`.
 */
const getAuditIp = (requestHeaders?: Headers): string | null => {
  if (!requestHeaders) {
    return null;
  }

  const forwardedFor = requestHeaders.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return requestHeaders.get('x-real-ip');
};

/**
 * Пишет структурированный audit-лог backup-механизма без чувствительных данных.
 * @param event - данные события аудита.
 */
export const logBackupAuditEvent = (event: BackupAuditEvent): void => {
  const payload = {
    scope: 'backup',
    action: event.action,
    level: event.level ?? 'info',
    userId: event.userId ?? null,
    jobId: event.jobId ?? null,
    fileName: event.fileName ?? null,
    fileSize: event.fileSize ?? null,
    route: event.route ?? null,
    method: event.method ?? null,
    reason: event.reason ?? null,
    statusCode: event.statusCode ?? null,
    ip: event.ip ?? null,
    userAgent: event.userAgent ?? null,
    timestamp: new Date().toISOString()
  };
  const serialized = `${JSON.stringify(payload)}\n`;

  if (payload.level === 'error' || payload.level === 'warn') {
    process.stderr.write(serialized);
    return;
  }

  process.stdout.write(serialized);
};

/**
 * Создаёт безопасный audit-контекст из HTTP-заголовков.
 * @param requestHeaders - набор HTTP-заголовков.
 * @returns Нормализованные данные клиента.
 */
export const getBackupAuditClientContext = (
  requestHeaders?: Headers
): {
  ip: string | null;
  userAgent: string | null;
} => {
  return {
    ip: getAuditIp(requestHeaders),
    userAgent: requestHeaders?.get('user-agent') ?? null
  };
};
