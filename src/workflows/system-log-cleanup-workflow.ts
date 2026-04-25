type SystemLogCleanupWorkflowParams = {
  triggeredBy: 'cron' | 'manual';
};

type SystemLogCleanupWorkflowResult = {
  status: 'completed';
  triggeredBy: SystemLogCleanupWorkflowParams['triggeredBy'];
  retentionDays: number;
  deletedCount: number;
};

/**
 * Удаляет системные логи старше текущего срока хранения.
 * @returns Количество удалённых записей и retention-настройку.
 */
const deleteExpiredSystemLogsStep = async (): Promise<{
  retentionDays: number;
  deletedCount: number;
}> => {
  'use step';

  const { default: prisma } = await import('@/shared/lib/prisma');

  const settings = await prisma.systemLogSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      apiRequestsEnabled: true,
      aiErrorsEnabled: true,
      paymentErrorsEnabled: true,
      retentionDays: 30
    }
  });
  const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await prisma.systemLogEntry.deleteMany({
    where: {
      createdAt: {
        lt: cutoff
      }
    }
  });

  return {
    retentionDays: settings.retentionDays,
    deletedCount: deleted.count
  };
};

/**
 * Workflow автоматической очистки системного журнала.
 * @param params - Параметры запуска workflow.
 * @returns Итог очистки.
 */
export const runSystemLogCleanupWorkflow = async (
  params: SystemLogCleanupWorkflowParams
): Promise<SystemLogCleanupWorkflowResult> => {
  'use workflow';

  const cleanup = await deleteExpiredSystemLogsStep();

  return {
    status: 'completed',
    triggeredBy: params.triggeredBy,
    retentionDays: cleanup.retentionDays,
    deletedCount: cleanup.deletedCount
  };
};
