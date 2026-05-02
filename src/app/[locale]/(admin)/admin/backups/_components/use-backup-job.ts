'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import {
  BACKUP_JOB_ERROR_POLL_INTERVAL_MS,
  BACKUP_JOB_POLL_INTERVAL_MS,
  BACKUP_JOB_QUEUED_POLL_INTERVAL_MS
} from '@/lib/config/backup';
import type { BackupJobSnapshot } from '@/modules/backup/types';

type UseBackupJobResult = {
  job: BackupJobSnapshot | null;
  error: string | null;
};

/**
 * Проверяет, завершено ли задание окончательно.
 * @param state - текущее состояние задания.
 * @returns `true`, если дальнейший опрос не нужен.
 */
const isFinalJobState = (state: BackupJobSnapshot['state'] | undefined): boolean => {
  return state === 'completed' || state === 'failed' || state === 'canceled';
};

/**
 * Возвращает адаптивный интервал опроса по текущему состоянию задания.
 * @param snapshot - последний снимок задания.
 * @param hasError - был ли сбой на предыдущем запросе.
 * @returns Интервал в миллисекундах до следующего запроса.
 */
const getNextPollInterval = (
  snapshot: BackupJobSnapshot | null,
  hasError: boolean
): number | null => {
  if (hasError) {
    return BACKUP_JOB_ERROR_POLL_INTERVAL_MS;
  }

  if (!snapshot) {
    return BACKUP_JOB_POLL_INTERVAL_MS;
  }

  if (isFinalJobState(snapshot.state)) {
    return null;
  }

  if (snapshot.state === 'queued') {
    return BACKUP_JOB_QUEUED_POLL_INTERVAL_MS;
  }

  return BACKUP_JOB_POLL_INTERVAL_MS;
};

/**
 * Опрос состояния backup/restore задания по job id с адаптивным интервалом.
 * @param jobId - идентификатор задания или `null`.
 * @returns Последний снимок задания и возможная ошибка опроса.
 */
export const useBackupJob = (jobId: string | null): UseBackupJobResult => {
  const [job, setJob] = useState<BackupJobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useEffectEvent(
    async (
      activeJobId: string
    ): Promise<{ snapshot: BackupJobSnapshot | null; hasError: boolean }> => {
      try {
        const response = await fetch(`/api/admin/backups/jobs/${activeJobId}`, {
          cache: 'no-store'
        });
        const data = (await response.json()) as BackupJobSnapshot | { error?: string };

        if (!response.ok) {
          throw new Error(
            typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
              ? data.error
              : 'Не удалось получить состояние задания.'
          );
        }

        const snapshot = data as BackupJobSnapshot;
        setJob(snapshot);
        setError(null);

        return {
          snapshot,
          hasError: false
        };
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось получить состояние задания.'
        );

        return {
          snapshot: null,
          hasError: true
        };
      }
    }
  );

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      return;
    }

    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    /**
     * Планирует следующий запрос статуса после завершения текущего.
     * @param snapshot - последний полученный снимок задания.
     * @param hasError - признак ошибки предыдущего запроса.
     */
    const scheduleNextFetch = (snapshot: BackupJobSnapshot | null, hasError: boolean): void => {
      const nextDelay = getNextPollInterval(snapshot, hasError);

      if (!isActive || nextDelay === null) {
        return;
      }

      timeoutId = setTimeout(() => {
        void runPollingCycle();
      }, nextDelay);
    };

    /**
     * Выполняет один цикл опроса без наложения параллельных запросов.
     */
    const runPollingCycle = async (): Promise<void> => {
      const result = await fetchJob(jobId);

      if (!isActive) {
        return;
      }

      scheduleNextFetch(result.snapshot, result.hasError);
    };

    void runPollingCycle();

    return () => {
      isActive = false;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  return {
    job,
    error
  };
};
