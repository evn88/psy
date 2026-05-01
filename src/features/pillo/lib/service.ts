import { PilloIntakeStatus, Role, type Prisma } from '@prisma/client';

import {
  generatePilloIntakesForRule,
  getPilloReminderWindowEnd,
  type PilloGeneratedIntake
} from '@/features/pillo/lib/schedule';
import { getPilloAppUrl, getPilloNotificationCopy, interpolatePilloCopy } from './notifications';
import { getPilloStockStatus, toNumber } from './stock';
import { sendPilloLowStockEmail } from '@/shared/lib/email';
import { startPilloIntakeReminderWorkflow } from '@/shared/lib/pillo-reminder-workflow';
import prisma from '@/shared/lib/prisma';
import { sendPushToMany } from '@/shared/lib/push';

type PilloRuleWithUser = Prisma.PilloScheduleRuleGetPayload<{
  include: {
    user: {
      select: {
        timezone: true;
      };
    };
    medication: {
      select: {
        isActive: true;
      };
    };
  };
}>;

type PilloMaterializeResult = {
  createdOrUpdated: number;
  workflowsStarted: number;
};

/**
 * Возвращает роль пользователя, если он может пользоваться Pillo.
 * @param role - роль из сессии или БД.
 * @returns true для ADMIN и USER.
 */
export const isPilloAllowedRole = (role: string | null | undefined): role is 'ADMIN' | 'USER' => {
  return role === Role.ADMIN || role === Role.USER;
};

/**
 * Создаёт настройки Pillo с дефолтами, если их ещё нет.
 * @param userId - идентификатор пользователя.
 * @returns Настройки Pillo.
 */
export const ensurePilloUserSettings = async (userId: string) => {
  return prisma.pilloUserSettings.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
};

/**
 * Создаёт или обновляет один материализованный приём.
 * @param intake - сгенерированный приём.
 * @returns Приём из БД.
 */
const upsertGeneratedPilloIntake = async (intake: PilloGeneratedIntake) => {
  return prisma.pilloIntake.upsert({
    where: {
      scheduleRuleId_scheduledFor: {
        scheduleRuleId: intake.scheduleRuleId,
        scheduledFor: intake.scheduledFor
      }
    },
    update: {
      medicationId: intake.medicationId,
      localDate: intake.localDate,
      localTime: intake.localTime,
      doseUnits: intake.doseUnits
    },
    create: {
      userId: intake.userId,
      medicationId: intake.medicationId,
      scheduleRuleId: intake.scheduleRuleId,
      scheduledFor: intake.scheduledFor,
      localDate: intake.localDate,
      localTime: intake.localTime,
      doseUnits: intake.doseUnits
    },
    include: {
      scheduleRule: {
        select: {
          reminderWorkflowVersion: true
        }
      }
    }
  });
};

/**
 * Запускает workflow для новых или восстановленных приёмов.
 * @param intakes - список приёмов из БД.
 * @returns Количество успешно запущенных workflow.
 */
const startPilloWorkflowsForIntakes = async (
  intakes: Awaited<ReturnType<typeof upsertGeneratedPilloIntake>>[]
): Promise<number> => {
  const results = await Promise.all(
    intakes.map(intake => startPilloIntakeReminderWorkflow(intake))
  );

  return results.filter(Boolean).length;
};

/**
 * Материализует rolling window приёмов для набора правил.
 * @param rules - правила расписания.
 * @param now - начало окна.
 * @returns Сводка созданных приёмов и workflow.
 */
const materializePilloRules = async (
  rules: PilloRuleWithUser[],
  now = new Date()
): Promise<PilloMaterializeResult> => {
  const upsertedIntakes = [];

  for (const rule of rules) {
    if (!rule.medication.isActive) {
      continue;
    }

    const generated = generatePilloIntakesForRule({
      rule,
      timezone: rule.user.timezone || 'UTC',
      windowStart: now,
      windowEnd: getPilloReminderWindowEnd(now)
    });

    for (const intake of generated) {
      upsertedIntakes.push(await upsertGeneratedPilloIntake(intake));
    }
  }

  const workflowsStarted = await startPilloWorkflowsForIntakes(upsertedIntakes);

  return {
    createdOrUpdated: upsertedIntakes.length,
    workflowsStarted
  };
};

/**
 * Материализует будущие приёмы пользователя на 48 часов.
 * @param userId - идентификатор пользователя.
 * @param now - начало окна.
 * @returns Сводка созданных приёмов и workflow.
 */
export const materializePilloIntakesForUser = async (
  userId: string,
  now = new Date()
): Promise<PilloMaterializeResult> => {
  const rules = await prisma.pilloScheduleRule.findMany({
    where: {
      userId,
      isActive: true,
      medication: { isActive: true }
    },
    include: {
      user: { select: { timezone: true } },
      medication: { select: { isActive: true } }
    }
  });

  return materializePilloRules(rules, now);
};

/**
 * Материализует будущие приёмы одного правила на 48 часов.
 * @param ruleId - идентификатор правила.
 * @param now - начало окна.
 * @returns Сводка созданных приёмов и workflow.
 */
export const materializePilloIntakesForRule = async (
  ruleId: string,
  now = new Date()
): Promise<PilloMaterializeResult> => {
  const rule = await prisma.pilloScheduleRule.findUnique({
    where: { id: ruleId },
    include: {
      user: { select: { timezone: true } },
      medication: { select: { isActive: true } }
    }
  });

  if (!rule || !rule.isActive) {
    return { createdOrUpdated: 0, workflowsStarted: 0 };
  }

  return materializePilloRules([rule], now);
};

/**
 * Восстанавливает daily window для всех активных пользователей Pillo.
 * @param now - текущий момент.
 * @returns Сводка cron-восстановления.
 */
export const recoverPilloReminderWindow = async (now = new Date()) => {
  const missed = await prisma.pilloIntake.updateMany({
    where: {
      status: PilloIntakeStatus.PENDING,
      scheduledFor: { lt: now }
    },
    data: {
      status: PilloIntakeStatus.MISSED,
      missedAt: now
    }
  });

  const rules = await prisma.pilloScheduleRule.findMany({
    where: {
      isActive: true,
      user: {
        isDisabled: false,
        role: { in: [Role.ADMIN, Role.USER] }
      },
      medication: { isActive: true }
    },
    include: {
      user: { select: { timezone: true } },
      medication: { select: { isActive: true } }
    }
  });

  const materialized = await materializePilloRules(rules, now);

  return {
    missedCount: missed.count,
    ...materialized
  };
};

/**
 * Отправляет уведомления о низком остатке после принятия лекарства.
 * @param params - данные пользователя и лекарства.
 */
const dispatchPilloLowStockNotifications = async (params: {
  userId: string;
  medicationName: string;
  stockText: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
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
  });

  if (!user || user.isDisabled || !isPilloAllowedRole(user.role)) {
    return;
  }

  const copy = getPilloNotificationCopy(user.language);
  const actionUrl = getPilloAppUrl(user.language);

  if (user.pilloUserSettings?.lowStockEmailEnabled !== false && user.email) {
    await sendPilloLowStockEmail({
      email: user.email,
      name: user.name || 'User',
      medicationName: params.medicationName,
      stockText: params.stockText,
      actionUrl,
      locale: user.language
    });
  }

  if (user.pilloUserSettings?.lowStockPushEnabled !== false && user.pushSubscriptions.length > 0) {
    await sendPushToMany(user.pushSubscriptions, {
      title: copy.pushLowStockTitle,
      body: interpolatePilloCopy(copy.pushLowStockBody, {
        name: params.medicationName,
        stock: params.stockText
      }),
      url: actionUrl
    });
  }
};

/**
 * Отмечает приём как принятый и уменьшает остаток лекарства.
 * @param userId - идентификатор пользователя.
 * @param intakeId - идентификатор приёма.
 * @returns Результат операции и актуальный остаток.
 */
export const takePilloIntake = async (userId: string, intakeId: string) => {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const intake = await tx.pilloIntake.findFirst({
      where: { id: intakeId, userId },
      include: { medication: true }
    });

    if (!intake) {
      return null;
    }

    if (intake.status === PilloIntakeStatus.TAKEN) {
      return { intake, medication: intake.medication, wasChanged: false };
    }

    if (intake.status !== PilloIntakeStatus.PENDING) {
      return { intake, medication: intake.medication, wasChanged: false };
    }

    const nextStock = Math.max(
      0,
      toNumber(intake.medication.stockUnits) - toNumber(intake.doseUnits)
    );
    const [updatedIntake, medication] = await Promise.all([
      tx.pilloIntake.update({
        where: { id: intake.id },
        data: {
          status: PilloIntakeStatus.TAKEN,
          takenAt: new Date()
        },
        include: { medication: true }
      }),
      tx.pilloMedication.update({
        where: { id: intake.medicationId },
        data: { stockUnits: nextStock }
      })
    ]);

    return { intake: updatedIntake, medication, wasChanged: true };
  });

  if (!result) {
    return null;
  }

  const status = getPilloStockStatus({
    stockUnits: result.medication.stockUnits,
    minThresholdUnits: result.medication.minThresholdUnits,
    nextDoseUnits: result.intake.doseUnits
  });

  if (result.wasChanged && status !== 'enough') {
    await dispatchPilloLowStockNotifications({
      userId,
      medicationName: result.medication.name,
      stockText: result.medication.stockUnits.toString()
    });
  }

  return { ...result, stockStatus: status };
};

/**
 * Отмечает приём как пропущенный пользователем.
 * @param userId - идентификатор пользователя.
 * @param intakeId - идентификатор приёма.
 * @returns `true`, если приём найден и обновлён.
 */
export const skipPilloIntake = async (userId: string, intakeId: string): Promise<boolean> => {
  const updated = await prisma.pilloIntake.updateMany({
    where: {
      id: intakeId,
      userId,
      status: PilloIntakeStatus.PENDING
    },
    data: {
      status: PilloIntakeStatus.SKIPPED,
      skippedAt: new Date()
    }
  });

  return updated.count > 0;
};
