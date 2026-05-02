import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupJobCancelledError } from '../errors';
import type { BackupJobSnapshot } from '../types';

const jobStore = vi.hoisted(() => new Map<string, BackupJobSnapshot>());

vi.mock('@/modules/backup/blob', () => {
  return {
    putPrivateJsonBlob: vi.fn(async (pathname: string, value: BackupJobSnapshot) => {
      jobStore.set(pathname, value);
      return {
        pathname,
        url: `https://private.blob.local/${pathname}`
      };
    }),
    getPrivateJsonBlob: vi.fn(async (pathname: string) => {
      return jobStore.get(pathname) ?? null;
    })
  };
});

describe('backup jobs cancellation', () => {
  beforeEach(() => {
    jobStore.clear();
    vi.clearAllMocks();
  });

  it('запрос отмены переводит задание в состояние остановки и запрещает продолжение', async () => {
    // Arrange
    const {
      assertBackupJobCanContinue,
      createInitialBackupJobSnapshot,
      requestBackupJobCancellation,
      writeBackupJobSnapshot
    } = await import('../jobs');
    const snapshot = {
      ...createInitialBackupJobSnapshot('job-1', 'create'),
      state: 'running' as const,
      progress: 48,
      currentStep: 'Собирается архив резервной копии.'
    };

    await writeBackupJobSnapshot(snapshot);

    // Act
    const updatedSnapshot = await requestBackupJobCancellation('job-1');

    // Assert
    expect(updatedSnapshot.state).toBe('canceling');
    expect(updatedSnapshot.cancelRequestedAt).toBeTruthy();
    await expect(assertBackupJobCanContinue('job-1')).rejects.toBeInstanceOf(
      BackupJobCancelledError
    );
  });

  it('финализация отмены переводит задание в состояние canceled', async () => {
    // Arrange
    const {
      cancelBackupJob,
      createInitialBackupJobSnapshot,
      requestBackupJobCancellation,
      readBackupJobSnapshot,
      writeBackupJobSnapshot
    } = await import('../jobs');
    const snapshot = {
      ...createInitialBackupJobSnapshot('job-2', 'create'),
      state: 'running' as const,
      progress: 61,
      currentStep: 'Добавляются private blob файлы.'
    };

    await writeBackupJobSnapshot(snapshot);
    await requestBackupJobCancellation('job-2');

    // Act
    await cancelBackupJob('job-2');
    const canceledSnapshot = await readBackupJobSnapshot('job-2');

    // Assert
    expect(canceledSnapshot?.state).toBe('canceled');
    expect(canceledSnapshot?.cancelledAt).toBeTruthy();
    expect(canceledSnapshot?.currentStep).toBe('Создание архива остановлено пользователем.');
  });
});
