/**
 * Ошибка, сигнализирующая о пользовательской отмене backup-задачи.
 */
export class BackupJobCancelledError extends Error {
  constructor(message = 'Операция резервного копирования отменена.') {
    super(message);
    this.name = 'BackupJobCancelledError';
  }
}
