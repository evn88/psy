import { Prisma, SystemAlertType } from '@prisma/client';

import prisma from '@/shared/lib/prisma';
import { sendWorkflowStepsThresholdAlertEmail } from '@/shared/lib/email';

export const DEFAULT_WORKFLOW_MONTHLY_STEP_LIMIT = 50_000;
export const DEFAULT_WORKFLOW_ALERT_THRESHOLD_PERCENT = 80;
export const DEFAULT_WORKFLOW_STEPS_PER_REMINDER = 3;

export type WorkflowBudgetConfig = {
  monthlyStepLimit: number;
  alertThresholdPercent: number;
  stepsPerReminder: number;
};

export type WorkflowBudgetSnapshot = {
  periodKey: string;
  monthlyStepLimit: number;
  alertThresholdPercent: number;
  stepsPerReminder: number;
  remindersCount: number;
  reminderEmailCount: number;
  reminderPushCount: number;
  totalSentNotifications: number;
  estimatedSteps: number;
  remainingSteps: number;
  thresholdSteps: number;
  usagePercent: number;
  thresholdAlertSentAt: Date | null;
  adminAlertEmailSentCount: number;
};

export type WorkflowBudgetThresholdCheckResult = WorkflowBudgetSnapshot & {
  thresholdReached: boolean;
  alreadyNotified: boolean;
  emailSentToAdmins: number;
};

/**
 * Преобразует значение env в положительное целое.
 * @param value - строковое значение из окружения.
 * @param fallback - значение по умолчанию при невалидном вводе.
 * @returns Положительное целое число.
 */
const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

/**
 * Преобразует значение env в процент от 1 до 100.
 * @param value - строковое значение из окружения.
 * @param fallback - значение по умолчанию при невалидном вводе.
 * @returns Валидный процент.
 */
const parsePercentEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    return fallback;
  }
  return parsed;
};

/**
 * Возвращает конфигурацию бюджетных лимитов Workflow.
 * @returns Настройки лимита и порога алерта.
 */
export const getWorkflowBudgetConfig = (): WorkflowBudgetConfig => {
  return {
    monthlyStepLimit: parsePositiveIntEnv(
      process.env.WORKFLOW_MONTHLY_STEP_LIMIT,
      DEFAULT_WORKFLOW_MONTHLY_STEP_LIMIT
    ),
    alertThresholdPercent: parsePercentEnv(
      process.env.WORKFLOW_ALERT_THRESHOLD_PERCENT,
      DEFAULT_WORKFLOW_ALERT_THRESHOLD_PERCENT
    ),
    stepsPerReminder: parsePositiveIntEnv(
      process.env.WORKFLOW_ESTIMATED_STEPS_PER_REMINDER,
      DEFAULT_WORKFLOW_STEPS_PER_REMINDER
    )
  };
};

/**
 * Возвращает UTC-границы текущего календарного месяца и ключ периода.
 * @returns Начало месяца, начало следующего месяца и ключ `YYYY-MM`.
 */
const getCurrentMonthRange = () => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
  const periodKey = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;

  return { monthStart, nextMonthStart, periodKey };
};

/**
 * Безопасно извлекает числовое значение из JSON-поля.
 * @param value - входное значение из JSON.
 * @returns Число либо 0, если значение невалидно.
 */
const parseJsonNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return value;
};

/**
 * Собирает счётчики отправленных напоминаний за текущий месяц.
 * @param monthStart - начало месяца в UTC.
 * @param nextMonthStart - начало следующего месяца в UTC.
 * @returns Агрегированные счётчики по событиям и каналам.
 */
const getMonthlyReminderCounters = async (monthStart: Date, nextMonthStart: Date) => {
  const [remindersCount, reminderEmailCount, reminderPushCount] = await prisma.$transaction([
    prisma.event.count({
      where: {
        OR: [
          {
            reminderEmailSentAt: {
              gte: monthStart,
              lt: nextMonthStart
            }
          },
          {
            reminderPushSentAt: {
              gte: monthStart,
              lt: nextMonthStart
            }
          }
        ]
      }
    }),
    prisma.event.count({
      where: {
        reminderEmailSentAt: {
          gte: monthStart,
          lt: nextMonthStart
        }
      }
    }),
    prisma.event.count({
      where: {
        reminderPushSentAt: {
          gte: monthStart,
          lt: nextMonthStart
        }
      }
    })
  ]);

  return {
    remindersCount,
    reminderEmailCount,
    reminderPushCount
  };
};

/**
 * Возвращает сводку по месячному расходу Workflow и отправленным напоминаниям.
 * @returns Актуальные значения лимита, использования и уведомлений.
 */
export const getWorkflowBudgetSnapshot = async (): Promise<WorkflowBudgetSnapshot> => {
  const { monthStart, nextMonthStart, periodKey } = getCurrentMonthRange();
  const config = getWorkflowBudgetConfig();
  const { remindersCount, reminderEmailCount, reminderPushCount } =
    await getMonthlyReminderCounters(monthStart, nextMonthStart);

  const estimatedSteps = remindersCount * config.stepsPerReminder;
  const remainingSteps = Math.max(config.monthlyStepLimit - estimatedSteps, 0);
  const thresholdSteps = Math.floor((config.monthlyStepLimit * config.alertThresholdPercent) / 100);
  const usagePercent = (estimatedSteps / config.monthlyStepLimit) * 100;

  const thresholdAlert = await prisma.systemAlert.findUnique({
    where: {
      type_periodKey: {
        type: SystemAlertType.WORKFLOW_STEPS_THRESHOLD,
        periodKey
      }
    },
    select: {
      createdAt: true,
      payload: true
    }
  });

  const payload = thresholdAlert?.payload;
  const adminAlertEmailSentCount =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? parseJsonNumber((payload as Record<string, unknown>).emailSentToAdmins)
      : 0;

  return {
    periodKey,
    monthlyStepLimit: config.monthlyStepLimit,
    alertThresholdPercent: config.alertThresholdPercent,
    stepsPerReminder: config.stepsPerReminder,
    remindersCount,
    reminderEmailCount,
    reminderPushCount,
    totalSentNotifications: reminderEmailCount + reminderPushCount,
    estimatedSteps,
    remainingSteps,
    thresholdSteps,
    usagePercent,
    thresholdAlertSentAt: thresholdAlert?.createdAt ?? null,
    adminAlertEmailSentCount
  };
};

/**
 * Проверяет месячный порог расхода Workflow и уведомляет админов один раз за месяц.
 * @returns Сводка по проверке лимита.
 */
export const checkAndNotifyWorkflowBudgetThreshold =
  async (): Promise<WorkflowBudgetThresholdCheckResult> => {
    const snapshot = await getWorkflowBudgetSnapshot();

    if (snapshot.estimatedSteps < snapshot.thresholdSteps) {
      return {
        ...snapshot,
        thresholdReached: false,
        alreadyNotified: false,
        emailSentToAdmins: snapshot.adminAlertEmailSentCount
      };
    }

    try {
      await prisma.systemAlert.create({
        data: {
          type: SystemAlertType.WORKFLOW_STEPS_THRESHOLD,
          periodKey: snapshot.periodKey,
          payload: {
            remindersCount: snapshot.remindersCount,
            reminderEmailCount: snapshot.reminderEmailCount,
            reminderPushCount: snapshot.reminderPushCount,
            totalSentNotifications: snapshot.totalSentNotifications,
            estimatedSteps: snapshot.estimatedSteps,
            remainingSteps: snapshot.remainingSteps,
            thresholdSteps: snapshot.thresholdSteps,
            monthlyStepLimit: snapshot.monthlyStepLimit,
            usagePercent: snapshot.usagePercent,
            thresholdPercent: snapshot.alertThresholdPercent
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return {
          ...snapshot,
          thresholdReached: true,
          alreadyNotified: true,
          emailSentToAdmins: snapshot.adminAlertEmailSentCount
        };
      }
      throw error;
    }

    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isDisabled: false,
        email: {
          not: null
        }
      },
      select: {
        name: true,
        email: true
      }
    });

    let emailSentToAdmins = 0;

    for (const admin of admins) {
      if (!admin.email) {
        continue;
      }

      const emailResult = await sendWorkflowStepsThresholdAlertEmail({
        email: admin.email,
        name: admin.name || 'Admin',
        periodKey: snapshot.periodKey,
        estimatedSteps: snapshot.estimatedSteps,
        monthlyLimit: snapshot.monthlyStepLimit,
        usagePercent: snapshot.usagePercent,
        thresholdPercent: snapshot.alertThresholdPercent,
        remindersCount: snapshot.remindersCount
      });

      if (emailResult) {
        emailSentToAdmins += 1;
      }
    }

    await prisma.systemAlert.update({
      where: {
        type_periodKey: {
          type: SystemAlertType.WORKFLOW_STEPS_THRESHOLD,
          periodKey: snapshot.periodKey
        }
      },
      data: {
        payload: {
          remindersCount: snapshot.remindersCount,
          reminderEmailCount: snapshot.reminderEmailCount,
          reminderPushCount: snapshot.reminderPushCount,
          totalSentNotifications: snapshot.totalSentNotifications,
          estimatedSteps: snapshot.estimatedSteps,
          remainingSteps: snapshot.remainingSteps,
          thresholdSteps: snapshot.thresholdSteps,
          monthlyStepLimit: snapshot.monthlyStepLimit,
          usagePercent: snapshot.usagePercent,
          thresholdPercent: snapshot.alertThresholdPercent,
          emailSentToAdmins
        }
      }
    });

    return {
      ...snapshot,
      thresholdReached: true,
      alreadyNotified: false,
      emailSentToAdmins
    };
  };
