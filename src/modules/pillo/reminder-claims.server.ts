import { PilloIntakeStatus } from '@prisma/client';

import prisma from '@/lib/prisma';

export const PILLO_REMINDER_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Атомарно резервирует приём для одного процесса отправки напоминания.
 * Истёкший claim разрешает безопасный повтор после сбоя доставки.
 * @param intakeId - идентификатор приёма.
 * @param claimedAt - время новой попытки доставки.
 * @returns `true`, если claim получен текущим процессом.
 */
export const claimPilloReminderIntake = async (
  intakeId: string,
  claimedAt: Date
): Promise<boolean> => {
  const staleBefore = new Date(claimedAt.getTime() - PILLO_REMINDER_CLAIM_TIMEOUT_MS);
  const result = await prisma.pilloIntake.updateMany({
    where: {
      id: intakeId,
      status: PilloIntakeStatus.PENDING,
      AND: [
        {
          OR: [{ reminderEmailSentAt: null }, { reminderPushSentAt: null }]
        },
        {
          OR: [
            { reminderWorkflowStartedAt: null },
            { reminderWorkflowStartedAt: { lte: staleBefore } }
          ]
        }
      ]
    },
    data: {
      reminderWorkflowStartedAt: claimedAt
    }
  });

  return result.count > 0;
};

/**
 * Атомарно резервирует Web Push и сразу ставит terminal marker до обращения к провайдеру.
 * Неистекающая reservation выбирает гарантию at-most-once: после аварии между
 * отправкой и фиксацией результата повторная доставка автоматически не выполняется.
 * @param intakeId - идентификатор приёма.
 * @param workflowClaimedAt - claim текущего workflow.
 * @param pushClaimedAt - уникальная метка попытки Web Push.
 * @param isEmailTerminal - завершён ли второй канал к моменту reservation.
 * @returns `true`, если текущий процесс получил право на отправку.
 */
export const reservePilloReminderPush = async (
  intakeId: string,
  workflowClaimedAt: Date,
  pushClaimedAt: Date,
  isEmailTerminal: boolean
): Promise<boolean> => {
  const result = await prisma.pilloIntake.updateMany({
    where: {
      id: intakeId,
      status: PilloIntakeStatus.PENDING,
      reminderWorkflowStartedAt: workflowClaimedAt,
      reminderPushClaimedAt: null,
      reminderPushSentAt: null
    },
    data: {
      reminderPushClaimedAt: pushClaimedAt,
      reminderPushSentAt: pushClaimedAt,
      ...(isEmailTerminal ? { reminderSentAt: pushClaimedAt } : {})
    }
  });

  return result.count > 0;
};

/**
 * Освобождает reservation только после подтверждённой ошибки провайдера.
 * CAS по обеим меткам не позволяет старому процессу снять чужую reservation.
 * @param intakeId - идентификатор приёма.
 * @param workflowClaimedAt - claim текущего workflow.
 * @param pushClaimedAt - метка освобождаемой попытки.
 */
export const releasePilloReminderPush = async (
  intakeId: string,
  workflowClaimedAt: Date,
  pushClaimedAt: Date
): Promise<void> => {
  await prisma.pilloIntake.updateMany({
    where: {
      id: intakeId,
      status: PilloIntakeStatus.PENDING,
      reminderWorkflowStartedAt: workflowClaimedAt,
      reminderPushClaimedAt: pushClaimedAt,
      reminderPushSentAt: pushClaimedAt
    },
    data: {
      reminderPushClaimedAt: null,
      reminderPushSentAt: null,
      reminderSentAt: null
    }
  });
};
