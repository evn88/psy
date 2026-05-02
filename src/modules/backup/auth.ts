import { auth } from '@/auth';
import { getBackupAuditClientContext, logBackupAuditEvent } from './audit';

export class BackupAccessError extends Error {
  public readonly statusCode = 403;
}

type RequireAdminSessionOptions = {
  route?: string;
  method?: string;
  requestHeaders?: Headers;
};

/**
 * Проверяет, что текущий пользователь авторизован как администратор.
 * @param options - дополнительные данные для аудита доступа.
 * @returns Краткие данные администратора.
 */
export const requireAdminSession = async (
  options: RequireAdminSessionOptions = {}
): Promise<{ userId: string }> => {
  const session = await auth();
  const clientContext = getBackupAuditClientContext(options.requestHeaders);

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    logBackupAuditEvent({
      action: 'backup_access_denied',
      level: 'warn',
      route: options.route,
      method: options.method,
      reason: !session?.user?.id ? 'missing_session' : 'insufficient_role',
      statusCode: 403,
      ...clientContext
    });

    throw new BackupAccessError('Доступ разрешён только администратору.');
  }

  return {
    userId: session.user.id
  };
};
