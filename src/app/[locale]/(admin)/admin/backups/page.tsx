import { headers } from 'next/headers';
import { forbidden } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getBackupAuditClientContext, logBackupAuditEvent } from '@/modules/backup/audit';
import { BackupAccessError, requireAdminSession } from '@/modules/backup/auth';
import { BackupManagementPanel } from './_components/BackupManagementPanel';

export const dynamic = 'force-dynamic';

/**
 * Страница управления резервными копиями.
 * @returns Серверная обёртка страницы админки.
 */
const AdminBackupsPage = async () => {
  const requestHeaders = await headers();

  try {
    const admin = await requireAdminSession({
      route: '/admin/backups',
      method: 'GET',
      requestHeaders
    });

    logBackupAuditEvent({
      action: 'backup_page_viewed',
      userId: admin.userId,
      route: '/admin/backups',
      method: 'GET',
      ...getBackupAuditClientContext(requestHeaders)
    });
  } catch (error) {
    if (error instanceof BackupAccessError) {
      forbidden();
    }

    throw error;
  }

  const t = await getTranslations('Admin.backups');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <BackupManagementPanel />
    </div>
  );
};

export default AdminBackupsPage;
