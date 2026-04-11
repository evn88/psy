import { start } from 'workflow/api';
import { runCreateSiteBackupWorkflow } from '@/workflows/create-site-backup-workflow';
import { runRestoreSiteBackupWorkflow } from '@/workflows/restore-site-backup-workflow';

/**
 * Запускает durable workflow создания резервной копии.
 * @param jobId - идентификатор задания.
 * @returns Идентификатор workflow run.
 */
export const startCreateSiteBackupWorkflow = async (jobId: string): Promise<string> => {
  const run = await start(runCreateSiteBackupWorkflow, [{ jobId }]);
  return run.runId;
};

/**
 * Запускает durable workflow восстановления из архива.
 * @param params - параметры restore задания.
 * @returns Идентификатор workflow run.
 */
export const startRestoreSiteBackupWorkflow = async (params: {
  jobId: string;
  databaseArchivePathname: string;
  databaseArchiveFileName?: string;
}): Promise<string> => {
  const run = await start(runRestoreSiteBackupWorkflow, [params]);
  return run.runId;
};
