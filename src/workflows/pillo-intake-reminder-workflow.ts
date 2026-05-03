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
import {
  createPilloActionToken as createPilloActionTokenValue,
  getPilloActionTokenExpiresAt,
  hashPilloActionToken
} from '@/modules/pillo/tokens';

type PilloIntakeReminderWorkflowParams = {
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
const ADMIN_ROLE = 'ADMIN';
const USER_ROLE = 'USER';
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

  if (
    intake.user.isDisabled ||
    (intake.user.role !== ADMIN_ROLE && intake.user.role !== USER_ROLE)
  ) {
    return 'user-is-not-eligible';
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
  return prisma.pilloIntake.findMany({
    where: {
      status: PENDING_INTAKE_STATUS,
      scheduledFor: { lte: now },
      OR: [{ reminderEmailSentAt: null }, { reminderPushSentAt: null }]
    },
    orderBy: { scheduledFor: 'asc' },
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
 * Создаёт одноразовую ссылку для подтверждения приёма.
 * @param intake - приём лекарства.
 * @returns Открытый токен для ссылки.
 */
const createPilloActionTokenStep = async (intake: PilloReminderIntakeRecord): Promise<string> => {
  const token = createPilloActionTokenValue();

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
  let hasFailedChannel = false;

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
      hasFailedChannel = true;
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
      hasFailedChannel = true;
    }
  } else if (!intake.reminderPushSentAt) {
    reminderPushSentAt = nowTimestamp;
  }

  await prisma.pilloIntake.update({
    where: { id: intake.id },
    data: {
      reminderEmailSentAt,
      reminderPushSentAt,
      reminderSentAt:
        reminderEmailSentAt && reminderPushSentAt ? nowTimestamp : intake.reminderSentAt
    }
  });

  if (hasFailedChannel) {
    return {
      status: 'failed',
      reason: 'delivery-failed',
      emailSent: isEmailSent,
      pushSent: isPushSent
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
    const result = await dispatchPilloIntakeReminder(intake);

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

  return {
    status: 'completed',
    scanned: totalScanned,
    sent: totalSent,
    skipped: totalSkipped,
    failed: totalFailed
  };
};
