'use client';

import { type ReactNode, useDeferredValue, useMemo, useState, useTransition } from 'react';
import { upload } from '@vercel/blob/client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Database,
  Download,
  FileArchive,
  HardDriveUpload,
  History,
  Loader2,
  Package,
  RotateCcw,
  Square
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  BACKUP_ALLOWED_UPLOAD_EXTENSIONS,
  BACKUP_ALLOWED_UPLOAD_TYPES,
  BACKUP_UPLOAD_PREFIX,
  MAX_BACKUP_ARCHIVE_SIZE_BYTES
} from '@/lib/config/backup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { BackupJobSnapshot } from '@/modules/backup/types';
import { useBackupJob } from './use-backup-job';

const restoreFormSchema = z.object({
  databaseArchiveFile: z
    .unknown()
    .refine(
      value => typeof FileList !== 'undefined' && value instanceof FileList && value.length > 0,
      'Выберите архив БД для восстановления.'
    )
});

type RestoreFormValues = z.infer<typeof restoreFormSchema>;

type BackupApiResponse = {
  jobId?: string;
  error?: string;
  code?: string;
};

/**
 * Преобразует статус задания в UI-вариант badge.
 * @param state - состояние задания.
 * @returns Название варианта badge.
 */
const getBadgeVariant = (state: BackupJobSnapshot['state'] | undefined) => {
  if (state === 'completed') {
    return 'default';
  }

  if (state === 'failed') {
    return 'destructive';
  }

  if (state === 'canceled') {
    return 'outline';
  }

  return 'secondary';
};

/**
 * Возвращает подпись для состояния задания.
 * @param state - состояние задания.
 * @param t - функция переводов.
 * @returns Локализованная подпись.
 */
const getStateLabel = (
  state: BackupJobSnapshot['state'] | undefined,
  t: ReturnType<typeof useTranslations>
): string => {
  if (state === 'completed') {
    return t('stateCompleted');
  }

  if (state === 'failed') {
    return t('stateFailed');
  }

  if (state === 'running') {
    return t('stateRunning');
  }

  if (state === 'canceling') {
    return t('stateCanceling');
  }

  if (state === 'canceled') {
    return t('stateCanceled');
  }

  return t('stateQueued');
};

/**
 * Возвращает безопасное имя файла архива без тяжёлой regex-цепочки.
 * @param fileName - исходное имя файла.
 * @returns Нормализованное имя файла.
 */
const sanitizeArchiveFileName = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  let result = '';
  let previousWasDash = false;

  for (const character of normalized) {
    const isAlphaNumeric =
      (character >= 'a' && character <= 'z') || (character >= '0' && character <= '9');
    const isSafePunctuation = character === '.' || character === '_' || character === '-';

    if (isAlphaNumeric || isSafePunctuation) {
      if (character === '-') {
        if (!previousWasDash && result.length > 0) {
          result += character;
        }
        previousWasDash = true;
        continue;
      }

      result += character;
      previousWasDash = false;
      continue;
    }

    if (!previousWasDash && result.length > 0) {
      result += '-';
      previousWasDash = true;
    }
  }

  return result.replace(/^-+|-+$/g, '');
};

/**
 * Проверяет, что имя файла имеет допустимое архивное расширение.
 * @param fileName - имя загружаемого файла.
 * @returns `true`, если расширение поддерживается.
 */
const hasAllowedArchiveExtension = (fileName: string): boolean => {
  const normalizedName = fileName.trim().toLowerCase();

  return BACKUP_ALLOWED_UPLOAD_EXTENSIONS.some(extension => normalizedName.endsWith(extension));
};

/**
 * Создаёт pathname для временной загрузки архива восстановления.
 * @param fileName - исходное имя файла.
 * @returns Путь внутри системного upload prefix.
 */
const createRestoreUploadPathname = (fileName: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = sanitizeArchiveFileName(fileName);

  return `${BACKUP_UPLOAD_PREFIX}/database/${timestamp}-${safeName || 'database-restore-archive.tar.gz'}`;
};

/**
 * Возвращает локализованное сообщение по коду API-ошибки backup-механизма.
 * @param response - ответ API с ошибкой.
 * @param t - функция переводов.
 * @param fallbackMessage - сообщение по умолчанию.
 * @returns Готовый текст для показа пользователю.
 */
const getBackupApiErrorMessage = (
  response: BackupApiResponse,
  t: ReturnType<typeof useTranslations>,
  fallbackMessage: string
): string => {
  if (response.code === 'BACKUP_UPLOAD_TYPE_INVALID') {
    return t('uploadInvalidType');
  }

  if (response.code === 'BACKUP_UPLOAD_SIZE_EXCEEDED') {
    return t('uploadInvalidSize', {
      size: `${Math.round(MAX_BACKUP_ARCHIVE_SIZE_BYTES / (1024 * 1024 * 1024))} ГБ`
    });
  }

  if (response.code === 'BACKUP_UPLOAD_PATH_INVALID') {
    return t('uploadInvalidName');
  }

  if (response.code) {
    return `${response.error ?? fallbackMessage} (${response.code})`;
  }

  return response.error ?? fallbackMessage;
};

/**
 * Выполняет раннюю клиентскую проверку архива перед загрузкой.
 * @param file - выбранный файл.
 * @param t - функция переводов.
 */
const assertArchiveFileIsSupported = (file: File, t: ReturnType<typeof useTranslations>): void => {
  if (file.size > MAX_BACKUP_ARCHIVE_SIZE_BYTES) {
    throw new Error(
      t('uploadInvalidSize', {
        size: `${Math.round(MAX_BACKUP_ARCHIVE_SIZE_BYTES / (1024 * 1024 * 1024))} ГБ`
      })
    );
  }

  if (!hasAllowedArchiveExtension(file.name)) {
    throw new Error(t('uploadInvalidName'));
  }

  if (
    file.type &&
    !BACKUP_ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof BACKUP_ALLOWED_UPLOAD_TYPES)[number])
  ) {
    throw new Error(t('uploadInvalidType'));
  }
};

/**
 * Рендерит текущее состояние backup/restore задания.
 * @param props - свойства отображения задания.
 * @returns JSX карточки прогресса.
 */
const JobStatusCard = ({
  title,
  description,
  job,
  error,
  action
}: {
  title: string;
  description: string;
  job: BackupJobSnapshot | null;
  error: string | null;
  action?: ReactNode;
}) => {
  const t = useTranslations('Admin.backups');
  const deferredEvents = useDeferredValue(job?.events ?? []);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={getBadgeVariant(job?.state)}>{getStateLabel(job?.state, t)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{job?.currentStep ?? t('waiting')}</span>
            <span className="font-medium">{job?.progress ?? 0}%</span>
          </div>
          <Progress value={job?.progress ?? 0} className="h-2" />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {job?.error ? <p className="text-sm text-destructive">{job.error}</p> : null}

        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-muted-foreground" />
            {t('historyTitle')}
          </div>
          <ScrollArea className="h-52 rounded-md border bg-muted/20 p-3">
            <div className="space-y-3">
              {deferredEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('historyEmpty')}</p>
              ) : (
                deferredEvents
                  .slice()
                  .reverse()
                  .map(event => (
                    <div key={event.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{new Date(event.createdAt).toLocaleString()}</span>
                        <span>{event.progress}%</span>
                      </div>
                      <p className="text-sm leading-5">{event.message}</p>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Главная панель управления резервными копиями БД в админке.
 * @returns Клиентский интерфейс создания и восстановления архива БД.
 */
export const BackupManagementPanel = () => {
  const t = useTranslations('Admin.backups');
  const [createJobId, setCreateJobId] = useState<string | null>(null);
  const [restoreJobId, setRestoreJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isCreateCancelPending, startCreateCancelTransition] = useTransition();
  const [isRestorePending, startRestoreTransition] = useTransition();

  const createJob = useBackupJob(createJobId);
  const restoreJob = useBackupJob(restoreJobId);

  const restoreForm = useForm<RestoreFormValues>({
    resolver: zodResolver(restoreFormSchema),
    defaultValues: {
      databaseArchiveFile: undefined
    }
  });

  const restoreMaxSizeLabel = useMemo(() => {
    return `${Math.round(MAX_BACKUP_ARCHIVE_SIZE_BYTES / (1024 * 1024 * 1024))} ГБ`;
  }, []);

  const isCreateJobActive =
    createJob.job?.state === 'queued' ||
    createJob.job?.state === 'running' ||
    createJob.job?.state === 'canceling';

  /**
   * Запускает создание архива БД.
   */
  const handleCreateBackup = () => {
    startCreateTransition(async () => {
      try {
        const response = await fetch('/api/admin/backups/create', {
          method: 'POST'
        });
        const data = (await response.json()) as BackupApiResponse;

        if (!response.ok || !data.jobId) {
          throw new Error(getBackupApiErrorMessage(data, t, t('createStartError')));
        }

        setCreateJobId(data.jobId);
        toast.success(t('createStarted'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('createStartError'));
      }
    });
  };

  /**
   * Запрашивает остановку активного создания архива.
   */
  const handleCancelCreateBackup = () => {
    if (!createJobId) {
      return;
    }

    startCreateCancelTransition(async () => {
      try {
        const response = await fetch(`/api/admin/backups/jobs/${createJobId}/cancel`, {
          method: 'POST'
        });
        const data = (await response.json()) as BackupApiResponse;

        if (!response.ok) {
          throw new Error(getBackupApiErrorMessage(data, t, t('cancelCreateError')));
        }

        toast.success(t('cancelCreateRequested'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('cancelCreateError'));
      }
    });
  };

  /**
   * Загружает архив восстановления в private blob.
   * @param file - исходный файл архива.
   * @returns Данные загруженного blob-файла.
   */
  const uploadRestoreArchive = async (file: File): Promise<{ pathname: string; url: string }> => {
    assertArchiveFileIsSupported(file, t);

    setUploadProgress(0);
    setUploadStep(t('uploadStarting'));

    const uploadedArchive = await upload(createRestoreUploadPathname(file.name), file, {
      access: 'private',
      multipart: true,
      handleUploadUrl: '/api/admin/backups/upload',
      clientPayload: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || null
      }),
      onUploadProgress: progressEvent => {
        const progress = Math.round(progressEvent.percentage);
        setUploadProgress(progress);
        setUploadStep(t('uploadInProgress', { progress }));
      }
    });

    setUploadProgress(100);
    setUploadStep(t('uploadCompleted'));

    return {
      pathname: uploadedArchive.pathname,
      url: uploadedArchive.url
    };
  };

  /**
   * Выполняет загрузку архива и запускает workflow восстановления.
   * @param values - значения формы восстановления.
   */
  const onSubmitRestore = (values: RestoreFormValues) => {
    startRestoreTransition(async () => {
      const databaseArchiveFile =
        values.databaseArchiveFile instanceof FileList ? values.databaseArchiveFile.item(0) : null;

      if (!databaseArchiveFile) {
        toast.error(t('restoreFileRequired'));
        return;
      }

      try {
        const uploadedDatabaseArchive = await uploadRestoreArchive(databaseArchiveFile);

        const response = await fetch('/api/admin/backups/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            databaseArchivePathname: uploadedDatabaseArchive.pathname,
            databaseArchiveFileName: databaseArchiveFile.name
          })
        });

        const data = (await response.json()) as BackupApiResponse;

        if (!response.ok || !data.jobId) {
          throw new Error(getBackupApiErrorMessage(data, t, t('restoreStartError')));
        }

        setRestoreJobId(data.jobId);
        toast.success(t('restoreStarted'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('restoreStartError'));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>{t('createCardTitle')}</CardTitle>
            </div>
            <CardDescription>{t('createCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              {t('createIncludes')}
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatePending || isCreateJobActive}
              className="w-full"
            >
              {isCreatePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('createButtonPending')}
                </>
              ) : isCreateJobActive ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('createButtonActive')}
                </>
              ) : (
                <>
                  <FileArchive className="mr-2 h-4 w-4" />
                  {t('createButton')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              <CardTitle>{t('restoreCardTitle')}</CardTitle>
            </div>
            <CardDescription>{t('restoreCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              {t('restoreWarning')}
            </div>

            <Form {...restoreForm}>
              <form onSubmit={restoreForm.handleSubmit(onSubmitRestore)} className="space-y-4">
                <FormField
                  control={restoreForm.control}
                  name="databaseArchiveFile"
                  render={({ field: { value: _value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>{t('databaseArchiveLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="file"
                          accept=".gz,.tar.gz,application/gzip,application/x-gzip,application/octet-stream"
                          onChange={event => onChange(event.target.files)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t('restoreFileHint', { size: restoreMaxSizeLabel })}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {uploadStep ? (
                  <div className="space-y-2 rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>{uploadStep}</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                ) : null}

                <Button type="submit" disabled={isRestorePending} className="w-full">
                  {isRestorePending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('restoreButtonPending')}
                    </>
                  ) : (
                    <>
                      <HardDriveUpload className="mr-2 h-4 w-4" />
                      {t('restoreButton')}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <JobStatusCard
          title={t('createStatusTitle')}
          description={t('createStatusDescription')}
          job={createJob.job}
          error={createJob.error}
          action={
            <>
              {createJob.job?.databaseArchiveDownloadUrl ? (
                <Button asChild variant="outline">
                  <a href={createJob.job.databaseArchiveDownloadUrl}>
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadDatabaseArchive')}
                  </a>
                </Button>
              ) : null}
              {isCreateJobActive ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCreateBackup}
                  disabled={isCreateCancelPending || createJob.job?.state === 'canceling'}
                >
                  {isCreateCancelPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('cancelCreatePending')}
                    </>
                  ) : (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      {t('cancelCreateButton')}
                    </>
                  )}
                </Button>
              ) : null}
            </>
          }
        />

        <JobStatusCard
          title={t('restoreStatusTitle')}
          description={t('restoreStatusDescription')}
          job={restoreJob.job}
          error={restoreJob.error}
          action={
            <>
              {restoreJob.job?.shadowDatabaseArchiveFileName ? (
                <Badge variant="outline">
                  <Package className="mr-2 h-3.5 w-3.5" />
                  {t('shadowDatabaseBackupReady', {
                    name: restoreJob.job.shadowDatabaseArchiveFileName
                  })}
                </Badge>
              ) : null}
            </>
          }
        />
      </div>
    </div>
  );
};
