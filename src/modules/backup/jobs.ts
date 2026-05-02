import type { BackupJobKind, BackupJobPhase, BackupJobSnapshot, BackupJobState } from './types';
import { BackupJobCancelledError } from './errors';
import { getPrivateJsonBlob, putPrivateJsonBlob } from './blob';
import { clampProgress, createJobStatusPathname } from './utils';

/**
 * Создаёт начальный снимок задания резервного копирования.
 * @param jobId - идентификатор задания.
 * @param kind - тип задания.
 * @returns Начальное состояние.
 */
export const createInitialBackupJobSnapshot = (
  jobId: string,
  kind: BackupJobKind
): BackupJobSnapshot => {
  const now = new Date().toISOString();

  return {
    id: jobId,
    kind,
    state: 'queued',
    phase: 'preparing',
    progress: 0,
    currentStep: 'Задание поставлено в очередь.',
    createdAt: now,
    updatedAt: now,
    events: []
  };
};

/**
 * Генерирует новый идентификатор задания.
 * @returns UUID для job state.
 */
export const createBackupJobId = (): string => {
  return globalThis.crypto.randomUUID();
};

/**
 * Проверяет, находится ли задание в финальном состоянии.
 * @param state - состояние задания.
 * @returns `true`, если задание завершено.
 */
const isFinalBackupJobState = (state: BackupJobState): boolean => {
  return state === 'completed' || state === 'failed' || state === 'canceled';
};

/**
 * Сохраняет полное состояние задания.
 * @param snapshot - полная структура состояния.
 */
export const writeBackupJobSnapshot = async (snapshot: BackupJobSnapshot): Promise<void> => {
  await putPrivateJsonBlob(createJobStatusPathname(snapshot.id), snapshot);
};

/**
 * Загружает состояние задания из private blob.
 * @param jobId - идентификатор задания.
 * @returns Состояние задания либо `null`.
 */
export const readBackupJobSnapshot = async (jobId: string): Promise<BackupJobSnapshot | null> => {
  return getPrivateJsonBlob<BackupJobSnapshot>(createJobStatusPathname(jobId));
};

/**
 * Обновляет состояние задания через функцию-модификатор.
 * @param jobId - идентификатор задания.
 * @param update - функция обновления.
 * @returns Итоговый снимок состояния.
 */
export const updateBackupJobSnapshot = async (
  jobId: string,
  update: (current: BackupJobSnapshot) => BackupJobSnapshot
): Promise<BackupJobSnapshot> => {
  const current =
    (await readBackupJobSnapshot(jobId)) ?? createInitialBackupJobSnapshot(jobId, 'create');
  const next = update(current);

  await writeBackupJobSnapshot(next);
  return next;
};

/**
 * Пишет событие прогресса в историю задания.
 * @param jobId - идентификатор задания.
 * @param phase - стадия выполнения.
 * @param message - текст текущего действия.
 * @param progress - прогресс в процентах.
 * @param state - опциональное состояние задания.
 * @param extra - дополнительные поля для снапшота.
 */
export const reportBackupJobProgress = async (
  jobId: string,
  phase: BackupJobPhase,
  message: string,
  progress: number,
  state: BackupJobState = 'running',
  extra: Partial<BackupJobSnapshot> = {}
): Promise<BackupJobSnapshot> => {
  return updateBackupJobSnapshot(jobId, current => {
    if (current.cancelRequestedAt && !isFinalBackupJobState(current.state)) {
      return current;
    }

    const normalizedProgress = clampProgress(progress);
    const now = new Date().toISOString();

    return {
      ...current,
      ...extra,
      state,
      phase,
      progress: normalizedProgress,
      currentStep: message,
      updatedAt: now,
      events: [
        ...current.events,
        {
          id: globalThis.crypto.randomUUID(),
          createdAt: now,
          phase,
          message,
          progress: normalizedProgress
        }
      ]
    };
  });
};

/**
 * Отмечает задание успешно завершённым.
 * @param jobId - идентификатор задания.
 * @param message - финальное сообщение.
 * @param extra - дополнительные поля.
 */
export const completeBackupJob = async (
  jobId: string,
  message: string,
  extra: Partial<BackupJobSnapshot> = {}
): Promise<BackupJobSnapshot> => {
  return reportBackupJobProgress(jobId, 'done', message, 100, 'completed', extra);
};

/**
 * Отмечает задание завершённым с ошибкой.
 * @param jobId - идентификатор задания.
 * @param error - текст ошибки.
 * @param extra - дополнительные поля.
 */
export const failBackupJob = async (
  jobId: string,
  error: string,
  extra: Partial<BackupJobSnapshot> = {}
): Promise<BackupJobSnapshot> => {
  return updateBackupJobSnapshot(jobId, current => {
    const now = new Date().toISOString();

    return {
      ...current,
      ...extra,
      state: 'failed',
      error,
      updatedAt: now,
      currentStep: error,
      events: [
        ...current.events,
        {
          id: globalThis.crypto.randomUUID(),
          createdAt: now,
          phase: current.phase,
          message: error,
          progress: current.progress
        }
      ]
    };
  });
};

/**
 * Запрашивает отмену активного задания резервного копирования.
 * @param jobId - идентификатор задания.
 * @param message - сообщение для пользователя.
 * @returns Обновлённый снимок задания.
 */
export const requestBackupJobCancellation = async (
  jobId: string,
  message = 'Запрошена остановка создания архива.'
): Promise<BackupJobSnapshot> => {
  return updateBackupJobSnapshot(jobId, current => {
    if (isFinalBackupJobState(current.state)) {
      return current;
    }

    if (current.cancelRequestedAt) {
      return current;
    }

    const now = new Date().toISOString();

    return {
      ...current,
      state: 'canceling',
      cancelRequestedAt: now,
      updatedAt: now,
      currentStep: message,
      events: [
        ...current.events,
        {
          id: globalThis.crypto.randomUUID(),
          createdAt: now,
          phase: current.phase,
          message,
          progress: current.progress
        }
      ]
    };
  });
};

/**
 * Проверяет, не запрошена ли отмена задания.
 * @param jobId - идентификатор задания.
 */
export const assertBackupJobCanContinue = async (jobId: string): Promise<void> => {
  const snapshot = await readBackupJobSnapshot(jobId);

  if (snapshot?.cancelRequestedAt) {
    throw new BackupJobCancelledError('Создание архива остановлено по запросу пользователя.');
  }
};

/**
 * Отмечает задание отменённым.
 * @param jobId - идентификатор задания.
 * @param message - финальное сообщение.
 */
export const cancelBackupJob = async (
  jobId: string,
  message = 'Создание архива остановлено пользователем.'
): Promise<BackupJobSnapshot> => {
  return updateBackupJobSnapshot(jobId, current => {
    if (current.state === 'canceled') {
      return current;
    }

    const now = new Date().toISOString();

    return {
      ...current,
      state: 'canceled',
      cancelledAt: now,
      updatedAt: now,
      currentStep: message,
      events: [
        ...current.events,
        {
          id: globalThis.crypto.randomUUID(),
          createdAt: now,
          phase: current.phase,
          message,
          progress: current.progress
        }
      ]
    };
  });
};
