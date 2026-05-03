import { PilloIntakeStatus, Role, type Prisma } from '@prisma/client';

import {
  generatePilloIntakesForRule,
  getPilloLocalDateKey,
  getPilloLocalTimeKey,
  getPilloReminderWindowEnd,
  type PilloGeneratedIntake
} from '@/modules/pillo/schedule';
import { PILLO_MISSED_GRACE_HOURS } from '@/modules/pillo/constants';
import { getPilloAppUrl, getPilloNotificationCopy, interpolatePilloCopy } from './notifications';
import { getPilloStockStatus, toNumber, type PilloStockStatus } from './stock';
import {
  sendPilloCourseEndEmail,
  sendPilloEmptyStockEmail,
  sendPilloLowStockEmail
} from '@/lib/email';
import prisma from '@/lib/prisma';
import { sendPushToMany } from '@/lib/push';

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
};

type PilloStockNotificationReservation = {
  status: Exclude<PilloStockStatus, 'enough'> | null;
  markedAt: Date;
};

/**
 * Возвращает delegate ручных приёмов, если текущий Prisma client уже знает о модели.
 * Это защищает dev-runtime, когда schema уже обновлена, а процесс ещё живёт на старом client.
 * @param client - prisma client или transaction client.
 * @returns Delegate ручных приёмов либо `null`.
 */
const getPilloManualIntakeDelegate = (
  client: Prisma.TransactionClient | typeof prisma
): { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } | null => {
  const delegate = (client as { pilloManualIntake?: unknown }).pilloManualIntake;

  if (!delegate || typeof delegate !== 'object') {
    return null;
  }

  if (typeof (delegate as { create?: unknown }).create !== 'function') {
    return null;
  }

  return delegate as { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
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
 * Материализует rolling window приёмов для набора правил.
 * @param rules - правила расписания.
 * @param now - начало окна.
 * @returns Сводка созданных приёмов.
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

  return {
    createdOrUpdated: upsertedIntakes.length
  };
};

/**
 * Материализует будущие приёмы пользователя на 48 часов.
 * @param userId - идентификатор пользователя.
 * @param now - начало окна.
 * @returns Сводка созданных приёмов.
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
 * @returns Сводка созданных приёмов.
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
    return { createdOrUpdated: 0 };
  }

  return materializePilloRules([rule], now);
};

/**
 * Восстанавливает daily window для всех активных пользователей Pillo.
 * @param now - текущий момент.
 * @returns Сводка cron-восстановления.
 */
export const recoverPilloReminderWindow = async (now = new Date()) => {
  const missedBefore = new Date(now.getTime() - PILLO_MISSED_GRACE_HOURS * 60 * 60 * 1000);
  const missed = await prisma.pilloIntake.updateMany({
    where: {
      status: PilloIntakeStatus.PENDING,
      scheduledFor: { lt: missedBefore }
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
 * Отправляет уведомления о низком или критически низком остатке после принятия лекарства.
 * @param params - данные пользователя, лекарства и статус остатка.
 */
const dispatchPilloLowStockNotifications = async (params: {
  userId: string;
  medicationName: string;
  stockText: string;
  stockStatus: PilloStockStatus;
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
  const isEmptyStock = params.stockStatus === 'empty';

  if (user.pilloUserSettings?.lowStockEmailEnabled !== false && user.email) {
    const sendEmail = isEmptyStock ? sendPilloEmptyStockEmail : sendPilloLowStockEmail;
    await sendEmail({
      email: user.email,
      name: user.name || 'User',
      medicationName: params.medicationName,
      stockText: params.stockText,
      actionUrl,
      locale: user.language
    });
  }

  if (user.pilloUserSettings?.lowStockPushEnabled !== false && user.pushSubscriptions.length > 0) {
    const pushTitle = isEmptyStock ? copy.pushEmptyStockTitle : copy.pushLowStockTitle;
    const pushBody = isEmptyStock ? copy.pushEmptyStockBody : copy.pushLowStockBody;

    await sendPushToMany(user.pushSubscriptions, {
      title: pushTitle,
      body: interpolatePilloCopy(pushBody, {
        name: params.medicationName,
        stock: params.stockText
      }),
      url: actionUrl
    });
  }
};

/**
 * Определяет, нужно ли впервые отправить уведомление по текущему статусу остатка.
 * @param params - статус остатка и уже отправленные отметки таблетки.
 * @returns Статус для отправки или null.
 */
const reservePilloStockNotification = (params: {
  status: PilloStockStatus;
  lowStockNotifiedAt: Date | null;
  emptyStockNotifiedAt: Date | null;
  markedAt: Date;
}): PilloStockNotificationReservation => {
  if (params.status === 'low' && !params.lowStockNotifiedAt) {
    return { status: 'low', markedAt: params.markedAt };
  }

  if (params.status === 'empty' && !params.emptyStockNotifiedAt) {
    return { status: 'empty', markedAt: params.markedAt };
  }

  return { status: null, markedAt: params.markedAt };
};

/**
 * Возвращает отметки отправки уведомлений, которые нужно применить к таблетке.
 * @param reservation - зарезервированное уведомление.
 * @returns Частичное обновление Prisma.
 */
const getPilloStockNotificationMarkData = (
  reservation: PilloStockNotificationReservation
): Prisma.PilloMedicationUpdateInput => {
  if (reservation.status === 'low') {
    return { lowStockNotifiedAt: reservation.markedAt };
  }

  if (reservation.status === 'empty') {
    return { emptyStockNotifiedAt: reservation.markedAt };
  }

  return {};
};

/**
 * Сбрасывает отметки складских уведомлений, если запас снова стал достаточным.
 * @param status - новый статус остатка.
 * @returns Частичное обновление Prisma.
 */
const getPilloStockNotificationResetData = (
  status: PilloStockStatus
): Prisma.PilloMedicationUpdateInput => {
  if (status !== 'enough') {
    return {};
  }

  return {
    lowStockNotifiedAt: null,
    emptyStockNotifiedAt: null
  };
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

    const takenAt = new Date();
    const nextStock = Math.max(
      0,
      toNumber(intake.medication.stockUnits) - toNumber(intake.doseUnits)
    );
    const stockStatus = getPilloStockStatus({
      stockUnits: nextStock,
      minThresholdUnits: intake.medication.minThresholdUnits,
      nextDoseUnits: intake.doseUnits
    });
    const stockNotification = reservePilloStockNotification({
      status: stockStatus,
      lowStockNotifiedAt: intake.medication.lowStockNotifiedAt,
      emptyStockNotifiedAt: intake.medication.emptyStockNotifiedAt,
      markedAt: takenAt
    });
    const [updatedIntake, medication] = await Promise.all([
      tx.pilloIntake.update({
        where: { id: intake.id },
        data: {
          status: PilloIntakeStatus.TAKEN,
          takenAt
        },
        include: { medication: true }
      }),
      tx.pilloMedication.update({
        where: { id: intake.medicationId },
        data: {
          stockUnits: nextStock,
          ...getPilloStockNotificationMarkData(stockNotification)
        }
      })
    ]);

    return { intake: updatedIntake, medication, stockNotification, stockStatus, wasChanged: true };
  });

  if (!result) {
    return null;
  }

  const status =
    'stockStatus' in result
      ? result.stockStatus
      : getPilloStockStatus({
          stockUnits: result.medication.stockUnits,
          minThresholdUnits: result.medication.minThresholdUnits,
          nextDoseUnits: result.intake.doseUnits
        });

  if (result.wasChanged && 'stockNotification' in result && result.stockNotification.status) {
    await dispatchPilloLowStockNotifications({
      userId,
      medicationName: result.medication.name,
      stockText: result.medication.stockUnits.toString(),
      stockStatus: result.stockNotification.status
    });
  }

  return { ...result, stockStatus: status };
};

/**
 * Уменьшает остаток лекарства при ручной отметке приёма вне расписания.
 * @param userId - идентификатор пользователя.
 * @param medicationId - идентификатор таблетки.
 * @param doseUnits - сколько единиц было принято.
 * @returns Результат операции и актуальный остаток.
 */
export const takePilloMedicationNow = async (
  userId: string,
  medicationId: string,
  doseUnits: number
) => {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const takenAt = new Date();
    const manualIntakeDelegate = getPilloManualIntakeDelegate(tx);
    const medication = await tx.pilloMedication.findFirst({
      where: { id: medicationId, userId },
      include: {
        user: {
          select: {
            timezone: true
          }
        }
      }
    });

    if (!medication) {
      return null;
    }

    const timezone = medication.user.timezone || 'UTC';
    const nextStock = Math.max(0, toNumber(medication.stockUnits) - doseUnits);
    const stockStatus = getPilloStockStatus({
      stockUnits: nextStock,
      minThresholdUnits: medication.minThresholdUnits,
      nextDoseUnits: doseUnits
    });
    const stockNotification = reservePilloStockNotification({
      status: stockStatus,
      lowStockNotifiedAt: medication.lowStockNotifiedAt,
      emptyStockNotifiedAt: medication.emptyStockNotifiedAt,
      markedAt: takenAt
    });
    const writes: Array<Promise<unknown>> = [
      tx.pilloMedication.update({
        where: { id: medication.id },
        data: {
          stockUnits: nextStock,
          ...getPilloStockNotificationMarkData(stockNotification)
        }
      })
    ];

    if (manualIntakeDelegate) {
      writes.push(
        manualIntakeDelegate.create({
          data: {
            userId,
            medicationId: medication.id,
            doseUnits,
            takenAt,
            localDate: getPilloLocalDateKey(takenAt, timezone),
            localTime: getPilloLocalTimeKey(takenAt, timezone)
          }
        })
      );
    }

    const [updatedMedication] = await Promise.all(writes);

    return { medication: updatedMedication, stockNotification, stockStatus };
  });

  if (!result) {
    return null;
  }

  const status = result.stockStatus;

  if (result.stockNotification.status) {
    await dispatchPilloLowStockNotifications({
      userId,
      medicationName: result.medication.name,
      stockText: result.medication.stockUnits.toString(),
      stockStatus: result.stockNotification.status
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

/**
 * Отменяет предыдущий выбор по приёму.
 * Возвращает статус обратно в PENDING и восстанавливает остаток (если приём был отмечен как TAKEN).
 * @param userId - идентификатор пользователя.
 * @param intakeId - идентификатор приёма.
 * @returns Результат операции.
 */
export const undoPilloIntake = async (userId: string, intakeId: string) => {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const intake = await tx.pilloIntake.findFirst({
      where: { id: intakeId, userId },
      include: { medication: true }
    });

    if (!intake) {
      return null;
    }

    if (intake.status === PilloIntakeStatus.PENDING) {
      return { intake, wasChanged: false };
    }

    // Если был TAKEN, возвращаем остаток на место
    let nextStock = toNumber(intake.medication.stockUnits);
    if (intake.status === PilloIntakeStatus.TAKEN) {
      nextStock = nextStock + toNumber(intake.doseUnits);
      const stockStatus = getPilloStockStatus({
        stockUnits: nextStock,
        minThresholdUnits: intake.medication.minThresholdUnits,
        nextDoseUnits: intake.doseUnits
      });
      await tx.pilloMedication.update({
        where: { id: intake.medicationId },
        data: {
          stockUnits: nextStock,
          ...getPilloStockNotificationResetData(stockStatus)
        }
      });
    }

    const updatedIntake = await tx.pilloIntake.update({
      where: { id: intake.id },
      data: {
        status: PilloIntakeStatus.PENDING,
        takenAt: null,
        skippedAt: null
      }
    });

    return { intake: updatedIntake, wasChanged: true };
  });

  return result;
};

/**
 * Проверяет и отправляет уведомления о завершении курсов приёма.
 * Находит все активные правила с endDate, которое уже наступило,
 * и отправляет уведомления тем, кому они ещё не отправлялись.
 * @returns Количество отправленных уведомлений.
 */
export const checkPilloCourseEndNotifications = async (): Promise<{ notified: number }> => {
  const now = new Date();

  // Правила с endDate ≤ сейчас, активные, ещё не нотифицированные
  const expiredRules = await prisma.pilloScheduleRule.findMany({
    where: {
      isActive: true,
      endDate: { lte: now },
      courseEndNotifiedAt: null
    },
    include: {
      medication: true,
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

  let notifiedCount = 0;

  for (const rule of expiredRules) {
    const { user } = rule;

    if (user.isDisabled || !isPilloAllowedRole(user.role)) {
      // Помечаем как обработанное, чтобы не проверять повторно
      await prisma.pilloScheduleRule.update({
        where: { id: rule.id },
        data: { courseEndNotifiedAt: now }
      });
      continue;
    }

    const copy = getPilloNotificationCopy(user.language);
    const actionUrl = getPilloAppUrl(user.language);
    const endDateText = rule.endDate
      ? rule.endDate.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '';

    // Email-уведомление
    if (user.pilloUserSettings?.emailRemindersEnabled !== false && user.email) {
      await sendPilloCourseEndEmail({
        email: user.email,
        name: user.name || 'User',
        medicationName: rule.medication.name,
        endDateText,
        actionUrl,
        locale: user.language
      });
    }

    // Push-уведомление
    if (
      user.pilloUserSettings?.pushRemindersEnabled !== false &&
      user.pushSubscriptions.length > 0
    ) {
      await sendPushToMany(user.pushSubscriptions, {
        title: copy.pushCourseEndTitle,
        body: interpolatePilloCopy(copy.pushCourseEndBody, {
          name: rule.medication.name
        }),
        url: actionUrl
      });
    }

    // Помечаем правило как нотифицированное
    await prisma.pilloScheduleRule.update({
      where: { id: rule.id },
      data: { courseEndNotifiedAt: now }
    });

    notifiedCount++;
  }

  return { notified: notifiedCount };
};
