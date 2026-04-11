import { BackupJobCancelledError } from '@/shared/lib/backup/errors';
import type { BackupArchiveResult, DatabaseBackupArchiveManifest } from '@/shared/lib/backup/types';

type CreateSiteBackupWorkflowParams = {
  jobId: string;
};

type CreateSiteBackupWorkflowResult = {
  status: 'completed' | 'failed' | 'canceled';
  databaseArchivePathname?: string;
  databaseArchiveFileName?: string;
  error?: string;
};

/**
 * Отмечает старт workflow создания резервной копии.
 * @param params - параметры запуска.
 */
const markCreateBackupStartStep = async (params: CreateSiteBackupWorkflowParams): Promise<void> => {
  'use step';

  const { reportBackupJobProgress } = await import('@/shared/lib/backup/jobs');

  await reportBackupJobProgress(
    params.jobId,
    'preparing',
    'Workflow создания архива БД запущен.',
    1
  );
};

/**
 * Создаёт архив БД.
 * @param params - параметры запуска workflow.
 * @returns Информация о созданном архиве БД.
 */
const createDatabaseBackupStep = async (
  params: CreateSiteBackupWorkflowParams
): Promise<BackupArchiveResult<DatabaseBackupArchiveManifest>> => {
  'use step';

  const [{ createDatabaseBackupArchive }, { assertBackupJobCanContinue, reportBackupJobProgress }] =
    await Promise.all([import('@/shared/lib/backup/service'), import('@/shared/lib/backup/jobs')]);

  return createDatabaseBackupArchive(
    'manual',
    async progress => {
      await reportBackupJobProgress(
        params.jobId,
        progress.phase,
        progress.message,
        progress.progress
      );
    },
    {
      assertCanContinue: async () => {
        await assertBackupJobCanContinue(params.jobId);
      }
    }
  );
};

/**
 * Сохраняет артефакт БД в статус задания.
 * @param params - параметры запуска.
 * @param archive - данные созданного архива БД.
 */
const storeDatabaseArchiveStep = async (
  params: CreateSiteBackupWorkflowParams,
  archive: BackupArchiveResult<DatabaseBackupArchiveManifest>
): Promise<void> => {
  'use step';

  const { updateBackupJobSnapshot } = await import('@/shared/lib/backup/jobs');

  await updateBackupJobSnapshot(params.jobId, current => ({
    ...current,
    databaseArchivePathname: archive.pathname,
    databaseArchiveFileName: archive.fileName,
    databaseArchiveDownloadUrl: `/api/admin/backups/download/${params.jobId}`
  }));
};

/**
 * Отмечает успешное завершение задания.
 * @param params - параметры запуска.
 */
const completeCreateBackupStep = async (params: CreateSiteBackupWorkflowParams): Promise<void> => {
  'use step';

  const { assertBackupJobCanContinue, completeBackupJob } = await import(
    '@/shared/lib/backup/jobs'
  );

  await assertBackupJobCanContinue(params.jobId);
  await completeBackupJob(params.jobId, 'Архив БД готов к скачиванию.');
};

/**
 * Отмечает падение задания создания backup.
 * @param params - параметры запуска.
 * @param message - текст ошибки.
 */
const failCreateBackupStep = async (
  params: CreateSiteBackupWorkflowParams,
  message: string
): Promise<void> => {
  'use step';

  const { failBackupJob } = await import('@/shared/lib/backup/jobs');
  await failBackupJob(params.jobId, message);
};

/**
 * Отмечает задание отменённым по запросу пользователя.
 * @param params - параметры запуска.
 * @param message - финальное сообщение.
 */
const cancelCreateBackupStep = async (
  params: CreateSiteBackupWorkflowParams,
  message: string
): Promise<void> => {
  'use step';

  const { cancelBackupJob } = await import('@/shared/lib/backup/jobs');
  await cancelBackupJob(params.jobId, message);
};

/**
 * Durable workflow создания архива БД.
 * @param params - входные параметры.
 * @returns Итог выполнения workflow.
 */
export const runCreateSiteBackupWorkflow = async (
  params: CreateSiteBackupWorkflowParams
): Promise<CreateSiteBackupWorkflowResult> => {
  'use workflow';

  try {
    await markCreateBackupStartStep(params);

    const databaseArchive = await createDatabaseBackupStep(params);
    await storeDatabaseArchiveStep(params, databaseArchive);
    await completeCreateBackupStep(params);

    return {
      status: 'completed',
      databaseArchivePathname: databaseArchive.pathname,
      databaseArchiveFileName: databaseArchive.fileName
    };
  } catch (error) {
    if (error instanceof BackupJobCancelledError) {
      await cancelCreateBackupStep(params, error.message);

      return {
        status: 'canceled',
        error: error.message
      };
    }

    const message = error instanceof Error ? error.message : 'Не удалось создать архив БД.';

    await failCreateBackupStep(params, message);

    return {
      status: 'failed',
      error: message
    };
  }
};
