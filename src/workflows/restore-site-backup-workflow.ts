import type { BackupArchiveResult, DatabaseBackupArchiveManifest } from '@/modules/backup/types';

type RestoreSiteBackupWorkflowParams = {
  jobId: string;
  databaseArchivePathname: string;
  databaseArchiveFileName?: string;
};

type RestoreSiteBackupWorkflowResult = {
  status: 'completed' | 'failed';
  shadowDatabaseArchivePathname?: string;
  shadowDatabaseArchiveFileName?: string;
  error?: string;
};

/**
 * Отмечает старт workflow восстановления.
 * @param params - параметры запуска.
 */
const markRestoreBackupStartStep = async (
  params: RestoreSiteBackupWorkflowParams
): Promise<void> => {
  'use step';

  const { reportBackupJobProgress } = await import('@/modules/backup/jobs');

  await reportBackupJobProgress(
    params.jobId,
    'preparing',
    'Workflow восстановления БД из архива запущен.',
    1,
    'running',
    {
      sourceDatabaseUploadPathname: params.databaseArchivePathname,
      sourceDatabaseUploadFileName: params.databaseArchiveFileName
    }
  );
};

/**
 * Шаг workflow, выполняющий восстановление БД из архива.
 * @param params - входные параметры.
 * @returns Информация о созданной теневой копии.
 */
const restoreSiteBackupStep = async (
  params: RestoreSiteBackupWorkflowParams
): Promise<{
  databaseShadowBackup: BackupArchiveResult<DatabaseBackupArchiveManifest>;
}> => {
  'use step';

  const [{ restoreSiteBackupArchives }, { reportBackupJobProgress }] = await Promise.all([
    import('@/modules/backup/service'),
    import('@/modules/backup/jobs')
  ]);

  return restoreSiteBackupArchives(
    {
      databaseArchivePathname: params.databaseArchivePathname,
      databaseArchiveFileName: params.databaseArchiveFileName
    },
    async progress => {
      await reportBackupJobProgress(
        params.jobId,
        progress.phase,
        progress.message,
        progress.progress,
        'running',
        {
          sourceDatabaseUploadPathname: params.databaseArchivePathname,
          sourceDatabaseUploadFileName: params.databaseArchiveFileName
        }
      );
    },
    async shadowBackups => {
      await reportBackupJobProgress(
        params.jobId,
        'shadow',
        'Теневая копия БД создана перед восстановлением.',
        30,
        'running',
        {
          shadowDatabaseArchivePathname: shadowBackups.databaseShadowBackup.pathname,
          shadowDatabaseArchiveFileName: shadowBackups.databaseShadowBackup.fileName
        }
      );
    }
  );
};

/**
 * Отмечает успешное завершение restore.
 * @param params - параметры запуска.
 * @param result - результат восстановления.
 */
const completeRestoreBackupStep = async (
  params: RestoreSiteBackupWorkflowParams,
  result: {
    databaseShadowBackup: BackupArchiveResult<DatabaseBackupArchiveManifest>;
  }
): Promise<void> => {
  'use step';

  const { completeBackupJob } = await import('@/modules/backup/jobs');

  await completeBackupJob(
    params.jobId,
    'Восстановление БД завершено. При необходимости можно откатиться на теневую копию.',
    {
      shadowDatabaseArchivePathname: result.databaseShadowBackup.pathname,
      shadowDatabaseArchiveFileName: result.databaseShadowBackup.fileName
    }
  );
};

/**
 * Отмечает падение restore задания.
 * @param params - параметры запуска.
 * @param message - текст ошибки.
 */
const failRestoreBackupStep = async (
  params: RestoreSiteBackupWorkflowParams,
  message: string
): Promise<void> => {
  'use step';

  const { failBackupJob } = await import('@/modules/backup/jobs');
  await failBackupJob(params.jobId, message);
};

/**
 * Durable workflow восстановления БД из архива.
 * @param params - входные параметры.
 * @returns Итог выполнения restore.
 */
export const runRestoreSiteBackupWorkflow = async (
  params: RestoreSiteBackupWorkflowParams
): Promise<RestoreSiteBackupWorkflowResult> => {
  'use workflow';

  try {
    await markRestoreBackupStartStep(params);

    const result = await restoreSiteBackupStep(params);

    await completeRestoreBackupStep(params, result);

    return {
      status: 'completed',
      shadowDatabaseArchivePathname: result.databaseShadowBackup.pathname,
      shadowDatabaseArchiveFileName: result.databaseShadowBackup.fileName
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось восстановить БД из архива.';

    await failRestoreBackupStep(params, message);

    return {
      status: 'failed',
      error: message
    };
  }
};
