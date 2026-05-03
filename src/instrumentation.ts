import { startPilloIntakeReminderRunnerWorkflow } from '@/lib/pillo-reminder-workflow';
import prisma from '@/lib/prisma';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Ищем последний запуск краулера
      const lastStart = await prisma.systemLogEntry.findFirst({
        where: {
          category: 'API',
          source: 'PilloWorkflowRunner',
          operation: 'START'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const now = new Date().getTime();
      const lastStartTime = lastStart ? lastStart.createdAt.getTime() : 0;
      // Проверяем, сколько часов прошло с момента последнего запуска.
      // Краулер работает 24 часа. Если прошло больше 23 часов, мы можем запустить его снова,
      // чтобы избежать "дыры" в случае, если cron-задача по какой-то причине не сработает.
      const hoursSinceLastStart = (now - lastStartTime) / (1000 * 60 * 60);

      if (hoursSinceLastStart > 23) {
        console.log('[Instrumentation] Starting Pillo workflow runner on app startup...');
        await startPilloIntakeReminderRunnerWorkflow();
      } else {
        console.log(
          `[Instrumentation] Pillo workflow runner was already started ${Math.round(hoursSinceLastStart * 10) / 10} hours ago. Skipping.`
        );
      }
    } catch (e) {
      console.error('[Instrumentation] Error checking/starting Pillo workflow', e);
    }
  }
}
