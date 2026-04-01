import { EventStatus } from '@prisma/client';
import { start } from 'workflow/api';

import { runSessionReminderWorkflow } from '@/workflows/session-reminder-workflow';

const SCHEDULABLE_REMINDER_STATUSES = new Set<EventStatus>([
  EventStatus.SCHEDULED,
  EventStatus.PENDING_CONFIRMATION
]);

export type SessionReminderWorkflowTargetEvent = {
  id: string;
  userId: string | null;
  status: EventStatus;
  reminderWorkflowVersion: number;
};

/**
 * Проверяет, можно ли запустить workflow-напоминание для события.
 * @param event - упрощённая модель события.
 * @returns `true`, если событие подходит для планирования напоминания.
 */
const canScheduleSessionReminderWorkflow = (event: SessionReminderWorkflowTargetEvent): boolean => {
  return Boolean(event.userId) && SCHEDULABLE_REMINDER_STATUSES.has(event.status);
};

/**
 * Запускает workflow отправки напоминания для конкретного события.
 * @param event - упрощённая модель события.
 * @returns `true`, если запуск workflow был выполнен.
 */
export const startSessionReminderWorkflow = async (
  event: SessionReminderWorkflowTargetEvent
): Promise<boolean> => {
  if (!canScheduleSessionReminderWorkflow(event)) {
    return false;
  }

  try {
    await start(runSessionReminderWorkflow, [
      {
        eventId: event.id,
        reminderWorkflowVersion: event.reminderWorkflowVersion
      }
    ]);
    return true;
  } catch (error) {
    console.error('Failed to start session reminder workflow:', {
      eventId: event.id,
      error
    });
    return false;
  }
};
