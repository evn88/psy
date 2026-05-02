import type { Prisma } from '@prisma/client';
import { sleep } from 'workflow';

import {
  getPilloNotificationCopy,
  getPilloSkipUrl,
  getPilloTakeUrl,
  interpolatePilloCopy
} from '@/features/pillo/lib/notifications';
import {
  createPilloActionToken,
  getPilloActionTokenExpiresAt,
  hashPilloActionToken
} from '@/features/pillo/lib/tokens';
import { sendPilloIntakeReminderEmail } from '@/shared/lib/email';
import prisma from '@/shared/lib/prisma';
import { sendPushToMany } from '@/shared/lib/push';

type PilloIntakeReminderWorkflowParams = {
  intakeId: string;
  scheduleRuleVersion: number;
};

type PilloIntakeReminderWorkflowResult = {
  status: 'sent' | 'skipped';
  reason?: string;
  emailSent: boolean;
  pushSent: boolean;
};

type PilloReminderIntakeRecord = Prisma.PilloIntakeGetPayload<{
  include: {
    medication: true;
    scheduleRule: true;
    user: {
      include: {
        pilloUserSettings: true;
        pushSubscriptions: {
          select: {
            endpoint: true;
            p256dh: true;
            auth: true;
          };
        };
      };
    };
  };
}>;

type PilloReminderReadiness = {
  isReady: boolean;
  reason: string;
  triggerAt: Date;
};

const PENDING_INTAKE_STATUS = 'PENDING';
const ADMIN_ROLE = 'ADMIN';
const USER_ROLE = 'USER';

/**
 * Формирует человекочитаемый текст дозы.
 * @param intake - приём с таблеткой.
 * @returns Текст дозы для email и push.
 */
const getPilloDoseText = (intake: PilloReminderIntakeRecord): string => {
  return `${intake.doseUnits.toString()} x ${intake.medication.dosage}`;
};

/**
 * Загружает приём Pillo вместе с пользователем, таблеткой и правилом.
 * @param intakeId - идентификатор приёма.
 * @returns Приём или null.
 */
const loadPilloReminderIntakeByIdStep = async (
  intakeId: string
): Promise<PilloReminderIntakeRecord | null> => {
  'use step';

  return prisma.pilloIntake.findUnique({
    where: { id: intakeId },
    include: {
      medication: true,
      scheduleRule: true,
      user: {
        include: {
          pilloUserSettings: true,
          pushSubscriptions: {
            select: {
              endpoint: true,
              p256dh: true,
              auth: true
            }
          }
        }
      }
    }
  });
};

/**
 * Проверяет, можно ли отправлять напоминание для текущего состояния приёма.
 * @param intake - приём с зависимостями.
 * @param expectedVersion - версия правила на момент запуска workflow.
 * @returns Результат проверки готовности.
 */
const getPilloReminderReadiness = (
  intake: PilloReminderIntakeRecord | null,
  expectedVersion: number
): PilloReminderReadiness => {
  const now = new Date();

  if (!intake) {
    return { isReady: false, reason: 'intake-not-found', triggerAt: now };
  }

  if (intake.status !== PENDING_INTAKE_STATUS) {
    return { isReady: false, reason: 'intake-is-not-pending', triggerAt: intake.scheduledFor };
  }

  if (intake.scheduleRule.reminderWorkflowVersion !== expectedVersion) {
    return {
      isReady: false,
      reason: 'stale-schedule-rule-version',
      triggerAt: intake.scheduledFor
    };
  }

  if (!intake.scheduleRule.isActive) {
    return { isReady: false, reason: 'schedule-rule-disabled', triggerAt: intake.scheduledFor };
  }

  if (!intake.medication.isActive) {
    return { isReady: false, reason: 'medication-disabled', triggerAt: intake.scheduledFor };
  }

  if (
    intake.user.isDisabled ||
    (intake.user.role !== ADMIN_ROLE && intake.user.role !== USER_ROLE)
  ) {
    return { isReady: false, reason: 'user-is-not-eligible', triggerAt: intake.scheduledFor };
  }

  if (intake.reminderSentAt || (intake.reminderEmailSentAt && intake.reminderPushSentAt)) {
    return { isReady: false, reason: 'reminder-already-sent', triggerAt: intake.scheduledFor };
  }

  return { isReady: true, reason: 'ready', triggerAt: intake.scheduledFor };
};

/**
 * Создаёт одноразовую ссылку для подтверждения приёма.
 * @param intake - приём лекарства.
 * @returns Открытый токен для ссылки.
 */
const createPilloActionTokenStep = async (intake: PilloReminderIntakeRecord): Promise<string> => {
  const token = createPilloActionToken();

  await prisma.pilloIntakeActionToken.create({
    data: {
      userId: intake.userId,
      intakeId: intake.id,
      tokenHash: hashPilloActionToken(token),
      expiresAt: getPilloActionTokenExpiresAt()
    }
  });

  return token;
};

/**
 * Отправляет email и push-напоминание по готовому приёму.
 * @param params - параметры workflow.
 * @returns Результат отправки.
 */
const dispatchPilloIntakeReminderStep = async (
  params: PilloIntakeReminderWorkflowParams
): Promise<PilloIntakeReminderWorkflowResult> => {
  'use step';

  const intake = await prisma.pilloIntake.findUnique({
    where: { id: params.intakeId },
    include: {
      medication: true,
      scheduleRule: true,
      user: {
        include: {
          pilloUserSettings: true,
          pushSubscriptions: {
            select: {
              endpoint: true,
              p256dh: true,
              auth: true
            }
          }
        }
      }
    }
  });
  const readiness = getPilloReminderReadiness(intake, params.scheduleRuleVersion);

  if (!readiness.isReady || !intake) {
    return {
      status: 'skipped',
      reason: readiness.reason,
      emailSent: false,
      pushSent: false
    };
  }

  const settings = intake.user.pilloUserSettings;
  const isEmailEnabled = settings?.emailRemindersEnabled !== false;
  const isPushEnabled = settings?.pushRemindersEnabled !== false;
  const token = await createPilloActionTokenStep(intake);
  const actionUrl = getPilloTakeUrl({ locale: intake.user.language, token });
  const skipUrl = getPilloSkipUrl({ locale: intake.user.language, token });
  const copy = getPilloNotificationCopy(intake.user.language);
  const doseText = getPilloDoseText(intake);
  const nowTimestamp = new Date();
  let reminderEmailSentAt = intake.reminderEmailSentAt;
  let reminderPushSentAt = intake.reminderPushSentAt;
  let isEmailSent = false;
  let isPushSent = false;
  let shouldRetryDelivery = false;

  if (!intake.reminderEmailSentAt && isEmailEnabled && intake.user.email) {
    const emailResult = await sendPilloIntakeReminderEmail({
      email: intake.user.email,
      name: intake.user.name || 'User',
      medicationName: intake.medication.name,
      doseText,
      scheduledFor: intake.scheduledFor,
      actionUrl,
      skipUrl,
      locale: intake.user.language,
      timezone: intake.user.timezone || 'UTC'
    });

    if (emailResult) {
      isEmailSent = true;
      reminderEmailSentAt = nowTimestamp;
    } else {
      shouldRetryDelivery = true;
    }
  } else if (!intake.reminderEmailSentAt) {
    reminderEmailSentAt = nowTimestamp;
  }

  if (!intake.reminderPushSentAt && isPushEnabled && intake.user.pushSubscriptions.length > 0) {
    const pushResults = await sendPushToMany(intake.user.pushSubscriptions, {
      title: copy.pushIntakeTitle,
      body: interpolatePilloCopy(copy.pushIntakeBody, {
        name: intake.medication.name,
        dose: doseText
      }),
      url: actionUrl
    });

    if (pushResults.some(item => item.success)) {
      isPushSent = true;
      reminderPushSentAt = nowTimestamp;
    } else {
      shouldRetryDelivery = true;
    }
  } else if (!intake.reminderPushSentAt) {
    reminderPushSentAt = nowTimestamp;
  }

  if (
    reminderEmailSentAt?.getTime() !== intake.reminderEmailSentAt?.getTime() ||
    reminderPushSentAt?.getTime() !== intake.reminderPushSentAt?.getTime()
  ) {
    await prisma.pilloIntake.update({
      where: { id: intake.id },
      data: {
        reminderEmailSentAt,
        reminderPushSentAt,
        reminderSentAt:
          reminderEmailSentAt && reminderPushSentAt ? nowTimestamp : intake.reminderSentAt
      }
    });
  }

  if (shouldRetryDelivery) {
    throw new Error('Pillo reminder delivery failed for at least one channel');
  }

  return {
    status: 'sent',
    emailSent: isEmailSent,
    pushSent: isPushSent
  };
};

/**
 * Workflow отправки Pillo-напоминания о приёме лекарства.
 * @param params - идентификатор приёма и версия правила.
 * @returns Итог отправки или причина пропуска.
 */
export const runPilloIntakeReminderWorkflow = async (
  params: PilloIntakeReminderWorkflowParams
): Promise<PilloIntakeReminderWorkflowResult> => {
  'use workflow';

  const intake = await loadPilloReminderIntakeByIdStep(params.intakeId);
  const readiness = getPilloReminderReadiness(intake, params.scheduleRuleVersion);

  if (!readiness.isReady) {
    return {
      status: 'skipped',
      reason: readiness.reason,
      emailSent: false,
      pushSent: false
    };
  }

  if (readiness.triggerAt > new Date()) {
    await sleep(readiness.triggerAt);
  }

  return dispatchPilloIntakeReminderStep(params);
};
