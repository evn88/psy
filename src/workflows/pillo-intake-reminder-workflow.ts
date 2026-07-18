import type { Prisma } from '@prisma/client';
import { sleep } from 'workflow';

import { sendPilloIntakeReminderEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import { sendPushToMany } from '@/lib/push';
import {
  getPilloNotificationCopy,
  getPilloSkipUrl,
  getPilloTakeUrl,
  interpolatePilloCopy
} from '@/modules/pillo/notifications';
import { isPilloGuestEmail } from '@/modules/pillo/guest';
import {
  createPilloReminderActionToken,
  getPilloActionTokenExpiresAt,
  hashPilloActionToken
} from '@/modules/pillo/tokens';
import {
  claimPilloReminderIntake,
  PILLO_REMINDER_CLAIM_TIMEOUT_MS,
  releasePilloReminderPush,
  reservePilloReminderPush
} from '@/modules/pillo/reminder-claims.server';
import { releasePilloRunnerLease } from '@/modules/pillo/workflow-lease.server';

type PilloIntakeReminderWorkflowParams = {
  holderId?: string;
  nowIso?: string;
};

type PilloIntakeReminderWorkflowResult = {
  status: 'completed';
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
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

type PilloReminderDispatchResult = {
  status: 'sent' | 'skipped' | 'failed';
  emailSent: boolean;
  pushSent: boolean;
  reason?: string;
};

const PENDING_INTAKE_STATUS = 'PENDING';
const PILLO_REMINDER_BATCH_SIZE = 100;

/**
 * Формирует человекочитаемый текст дозы.
 * @param intake - приём с таблеткой.
 * @returns Текст дозы для email и push.
 */
const getPilloDoseText = (intake: PilloReminderIntakeRecord): string => {
  return `${intake.doseUnits.toString()} x ${intake.medication.dosage}`;
};

/**
 * Нормализует опциональную дату запуска runner.
 * @param params - параметры workflow.
 * @returns Дата, относительно которой ищутся наступившие приёмы.
 */
const resolvePilloRunnerNow = (params: PilloIntakeReminderWorkflowParams): Date => {
  const parsedDate = params.nowIso ? new Date(params.nowIso) : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
};

/**
 * Проверяет, можно ли отправлять напоминание для текущего состояния приёма.
 * @param intake - приём с зависимостями.
 * @returns Причина пропуска или null.
 */
const getPilloReminderSkipReason = (intake: PilloReminderIntakeRecord): string | null => {
  if (intake.status !== PENDING_INTAKE_STATUS) {
    return 'intake-is-not-pending';
  }

  if (!intake.scheduleRule.isActive) {
    return 'schedule-rule-disabled';
  }

  if (!intake.medication.isActive) {
    return 'medication-disabled';
  }

  if (intake.user.isDisabled) {
    return 'user-is-disabled';
  }

  if (intake.reminderSentAt || (intake.reminderEmailSentAt && intake.reminderPushSentAt)) {
    return 'reminder-already-sent';
  }

  return null;
};

/**
 * Загружает наступившие приёмы Pillo для одного прохода runner.
 * @param now - верхняя граница наступивших приёмов.
 * @returns Список приёмов, которым ещё нужны напоминания.
 */
const loadDuePilloReminderIntakes = async (now: Date): Promise<PilloReminderIntakeRecord[]> => {
  const staleClaimBefore = new Date(now.getTime() - PILLO_REMINDER_CLAIM_TIMEOUT_MS);

  return prisma.pilloIntake.findMany({
    where: {
      status: PENDING_INTAKE_STATUS,
      scheduledFor: { lte: now },
      scheduleRule: { isActive: true },
      medication: { isActive: true },
      user: { isDisabled: false },
      AND: [
        {
          OR: [
            { reminderEmailSentAt: null },
            { reminderPushSentAt: null, reminderPushClaimedAt: null }
          ]
        },
        {
          OR: [
            { reminderWorkflowStartedAt: null },
            { reminderWorkflowStartedAt: { lte: staleClaimBefore } }
          ]
        }
      ]
    },
    orderBy: [
      { reminderWorkflowStartedAt: { sort: 'asc', nulls: 'first' } },
      { scheduledFor: 'asc' }
    ],
    take: PILLO_REMINDER_BATCH_SIZE,
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
 * Повторно загружает приём после claim и проверяет актуальное состояние зависимостей.
 * @param intakeId - идентификатор приёма.
 * @param claimedAt - метка текущего владельца claim.
 * @returns Актуальный приём или `null`, если он больше не требует отправки.
 */
const loadClaimedPilloReminderIntake = async (
  intakeId: string,
  claimedAt: Date
): Promise<PilloReminderIntakeRecord | null> => {
  return prisma.pilloIntake.findFirst({
    where: {
      id: intakeId,
      status: PENDING_INTAKE_STATUS,
      reminderWorkflowStartedAt: claimedAt,
      scheduleRule: { isActive: true },
      medication: { isActive: true },
      user: { isDisabled: false },
      OR: [{ reminderEmailSentAt: null }, { reminderPushSentAt: null, reminderPushClaimedAt: null }]
    },
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
 * Создаёт одноразовую ссылку для подтверждения приёма.
 * @param intake - приём лекарства.
 * @returns Открытый токен для ссылки.
 */
const createPilloActionTokenStep = async (intake: PilloReminderIntakeRecord): Promise<string> => {
  const token = createPilloReminderActionToken(intake.id);
  const tokenHash = hashPilloActionToken(token);
  const expiresAt = getPilloActionTokenExpiresAt();

  await prisma.pilloIntakeActionToken.upsert({
    where: { tokenHash },
    update: { expiresAt },
    create: {
      userId: intake.userId,
      intakeId: intake.id,
      tokenHash,
      expiresAt
    }
  });

  return token;
};

/**
 * Отправляет email и push-напоминание по одному наступившему приёму.
 * @param intake - приём с зависимостями.
 * @returns Результат отправки.
 */
const dispatchPilloIntakeReminder = async (
  intake: PilloReminderIntakeRecord
): Promise<PilloReminderDispatchResult> => {
  const skipReason = getPilloReminderSkipReason(intake);

  if (skipReason) {
    return {
      status: 'skipped',
      reason: skipReason,
      emailSent: false,
      pushSent: false
    };
  }

  const settings = intake.user.pilloUserSettings;
  const workflowClaimedAt = intake.reminderWorkflowStartedAt;

  if (!workflowClaimedAt) {
    return {
      status: 'skipped',
      reason: 'workflow-claim-missing',
      emailSent: false,
      pushSent: false
    };
  }

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
  let isPushAlreadyClaimed = false;
  let hasFailedChannel = false;

  if (
    !intake.reminderEmailSentAt &&
    isEmailEnabled &&
    intake.user.email &&
    !isPilloGuestEmail(intake.user.email)
  ) {
    const emailResult = await sendPilloIntakeReminderEmail({
      email: intake.user.email,
      name: intake.user.name || 'User',
      medicationName: intake.medication.name,
      doseText,
      scheduledFor: intake.scheduledFor,
      actionUrl,
      skipUrl,
      locale: intake.user.language,
      timezone: intake.user.timezone || 'UTC',
      idempotencyKey: `pillo-intake/${intake.id}/email-v1`
    });

    if (emailResult) {
      isEmailSent = true;
      reminderEmailSentAt = nowTimestamp;
    } else {
      hasFailedChannel = true;
    }
  } else if (!intake.reminderEmailSentAt) {
    reminderEmailSentAt = nowTimestamp;
  }

  if (!intake.reminderPushSentAt && isPushEnabled && intake.user.pushSubscriptions.length > 0) {
    const pushClaimedAt = new Date();
    const isPushReserved = await reservePilloReminderPush(
      intake.id,
      workflowClaimedAt,
      pushClaimedAt,
      Boolean(intake.reminderEmailSentAt)
    );

    if (isPushReserved) {
      reminderPushSentAt = pushClaimedAt;

      try {
        const pushResults = await sendPushToMany(intake.user.pushSubscriptions, {
          title: copy.pushIntakeTitle,
          body: interpolatePilloCopy(copy.pushIntakeBody, {
            name: intake.medication.name,
            dose: doseText
          }),
          url: actionUrl,
          tag: `pillo-intake-${intake.id}`,
          renotify: false
        });

        if (pushResults.some(item => item.success)) {
          isPushSent = true;
        } else {
          await releasePilloReminderPush(intake.id, workflowClaimedAt, pushClaimedAt);
          reminderPushSentAt = null;
          hasFailedChannel = true;
        }
      } catch {
        await releasePilloReminderPush(intake.id, workflowClaimedAt, pushClaimedAt);
        reminderPushSentAt = null;
        hasFailedChannel = true;
      }
    } else {
      isPushAlreadyClaimed = true;
    }
  } else if (!intake.reminderPushSentAt) {
    reminderPushSentAt = nowTimestamp;
  }

  const updateResult = await prisma.pilloIntake.updateMany({
    where: {
      id: intake.id,
      status: PENDING_INTAKE_STATUS,
      reminderWorkflowStartedAt: workflowClaimedAt
    },
    data: {
      reminderEmailSentAt,
      reminderPushSentAt,
      reminderSentAt:
        reminderEmailSentAt && reminderPushSentAt ? nowTimestamp : intake.reminderSentAt
    }
  });

  if (updateResult.count === 0) {
    return {
      status: 'skipped',
      reason: 'workflow-claim-lost',
      emailSent: isEmailSent,
      pushSent: isPushSent
    };
  }

  if (hasFailedChannel) {
    return {
      status: 'failed',
      reason: 'delivery-failed',
      emailSent: isEmailSent,
      pushSent: isPushSent
    };
  }

  if (isPushAlreadyClaimed) {
    return {
      status: 'skipped',
      reason: 'push-delivery-already-claimed',
      emailSent: isEmailSent,
      pushSent: false
    };
  }

  return {
    status: 'sent',
    emailSent: isEmailSent,
    pushSent: isPushSent
  };
};

/**
 * Выполняет один проход отправки Pillo-напоминаний для всех пользователей.
 * @param intakes - наступившие приёмы.
 * @returns Сводка отправки.
 */
const dispatchPilloIntakeRemindersStep = async (
  now: Date
): Promise<Omit<PilloIntakeReminderWorkflowResult, 'status'>> => {
  'use step';

  const intakes = await loadDuePilloReminderIntakes(now);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const intake of intakes) {
    const claimedAt = new Date();
    const isClaimed = await claimPilloReminderIntake(intake.id, claimedAt);

    if (!isClaimed) {
      skipped++;
      continue;
    }

    const claimedIntake = await loadClaimedPilloReminderIntake(intake.id, claimedAt);
    if (!claimedIntake) {
      skipped++;
      continue;
    }

    const result = await dispatchPilloIntakeReminder(claimedIntake);

    if (result.status === 'sent') {
      sent++;
    } else if (result.status === 'failed') {
      failed++;
    } else {
      skipped++;
    }
  }

  return { scanned: intakes.length, sent, skipped, failed };
};

/**
 * Освобождает lease после штатного завершения суточного runner.
 * @param holderId - идентификатор владельца lease.
 */
const releasePilloRunnerLeaseStep = async (holderId: string): Promise<void> => {
  'use step';

  await releasePilloRunnerLease(holderId);
};

/**
 * Workflow-раннер Pillo, который работает как краулер в течение 24 часов.
 * @param params - опциональная дата запуска для тестового/ручного вызова.
 * @returns Сводка обработанных напоминаний за все проходы.
 */
export const runPilloIntakeReminderWorkflow = async (
  params: PilloIntakeReminderWorkflowParams = {}
): Promise<PilloIntakeReminderWorkflowResult> => {
  'use workflow';

  let totalScanned = 0;
  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Ограничение cron на Vercel Hobby - 1 раз в день.
  // Запускаем цикл на 24 часа с интервалом проверки каждые 5 минут.
  // 24 часа = 288 итераций по 5 минут.
  const iterations = 288;

  for (let i = 0; i < iterations; i++) {
    // В первой итерации используем переданное время, если оно есть.
    // В последующих всегда берем текущее время, чтобы проверять актуальное расписание.
    const now = i === 0 ? resolvePilloRunnerNow(params) : new Date();

    const result = await dispatchPilloIntakeRemindersStep(now);

    totalScanned += result.scanned;
    totalSent += result.sent;
    totalSkipped += result.skipped;
    totalFailed += result.failed;

    // Спим 5 минут перед следующей проверкой
    if (i < iterations - 1) {
      await sleep('5m');
    }
  }

  if (params.holderId) {
    await releasePilloRunnerLeaseStep(params.holderId);
  }

  return {
    status: 'completed',
    scanned: totalScanned,
    sent: totalSent,
    skipped: totalSkipped,
    failed: totalFailed
  };
};
