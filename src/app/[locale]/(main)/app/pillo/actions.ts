'use server';

import { del, put } from '@vercel/blob';
import { PilloIntakeStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { locales } from '@/i18n/config';
import { hashPilloActionToken } from '@/features/pillo/lib/tokens';
import {
  materializePilloIntakesForRule,
  materializePilloIntakesForUser,
  skipPilloIntake,
  takePilloIntake,
  undoPilloIntake
} from '@/features/pillo/lib/service';
import {
  parsePilloDateInput,
  pilloMedicationSchema,
  pilloScheduleRuleSchema,
  pilloSettingsSchema
} from '@/features/pillo/lib/schemas';
import { requirePilloUserId, canUsePillo } from '@/features/pillo/lib/access';
import { resolveStockUnits } from '@/features/pillo/lib/stock';
import prisma from '@/shared/lib/prisma';

type PilloActionResult = {
  error?: string;
  success?: boolean;
};

/**
 * Инвалидирует локализованные страницы Pillo.
 */
const revalidatePilloPaths = () => {
  locales.forEach(locale => {
    revalidatePath(`/${locale}/app`);
    revalidatePath(`/${locale}/app/pillo`);
  });
};

/**
 * Сохраняет таблетку пользователя.
 * @param input - данные формы таблетки.
 * @returns Результат сохранения.
 */
export const savePilloMedicationAction = async (input: unknown): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();
  const parsed = pilloMedicationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Некорректные данные таблетки' };
  }

  const data = parsed.data;
  const stockUnits = resolveStockUnits({
    packagesCount: data.packagesCount,
    unitsPerPackage: data.unitsPerPackage,
    stockUnits: data.stockUnits
  });

  if (data.id) {
    const existing = await prisma.pilloMedication.findFirst({
      where: { id: data.id, userId }
    });

    if (!existing) {
      return { error: 'Таблетка не найдена или доступ запрещен' };
    }

    await prisma.pilloMedication.update({
      where: { id: data.id },
      data: {
        name: data.name,
        photoUrl: data.photoUrl,
        description: data.description,
        dosage: `${data.dosageValue} ${data.dosageUnit}`,
        dosageValue: data.dosageValue,
        dosageUnit: data.dosageUnit.replace('.', ''),
        form: data.form.replace('.', ''),
        packagesCount: data.packagesCount,
        unitsPerPackage: data.unitsPerPackage,
        stockUnits,
        minThresholdUnits: data.minThresholdUnits,
        isActive: data.isActive
      }
    });
  } else {
    await prisma.pilloMedication.create({
      data: {
        userId,
        name: data.name,
        photoUrl: data.photoUrl,
        description: data.description,
        dosage: `${data.dosageValue} ${data.dosageUnit}`,
        dosageValue: data.dosageValue,
        dosageUnit: data.dosageUnit.replace('.', ''),
        form: data.form.replace('.', ''),
        packagesCount: data.packagesCount,
        unitsPerPackage: data.unitsPerPackage,
        stockUnits,
        minThresholdUnits: data.minThresholdUnits,
        isActive: data.isActive
      }
    });
  }

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Удаляет таблетку и связанные правила пользователя.
 * @param medicationId - идентификатор таблетки.
 * @returns Результат удаления.
 */
export const deletePilloMedicationAction = async (
  medicationId: string
): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();

  await prisma.pilloMedication.deleteMany({
    where: { id: medicationId, userId }
  });

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Добавляет одну упаковку таблеток к остатку.
 * @param medicationId - идентификатор таблетки.
 * @returns Результат обновления.
 */
export const addPilloMedicationPackageAction = async (
  medicationId: string
): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();

  const medication = await prisma.pilloMedication.findFirst({
    where: { id: medicationId, userId }
  });

  if (!medication) {
    return { error: 'Таблетка не найдена' };
  }

  const unitsToAdd = medication.unitsPerPackage || 0;

  await prisma.pilloMedication.update({
    where: { id: medicationId },
    data: {
      packagesCount: { increment: 1 },
      stockUnits: { increment: unitsToAdd }
    }
  });

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Сохраняет правило расписания и запускает rolling window workflow.
 * @param input - данные формы правила.
 * @returns Результат сохранения.
 */
export const savePilloScheduleRuleAction = async (input: unknown): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();
  const parsed = pilloScheduleRuleSchema.safeParse(input);

  if (!parsed.success || parsed.data.daysOfWeek.length === 0) {
    return { error: 'Некорректные данные расписания' };
  }

  const data = parsed.data;
  const medication = await prisma.pilloMedication.findFirst({
    where: { id: data.medicationId, userId },
    select: { id: true }
  });

  if (!medication) {
    return { error: 'Таблетка не найдена' };
  }

  const baseData = {
    medicationId: data.medicationId,
    time: data.time,
    doseUnits: data.doseUnits,
    daysOfWeek: data.daysOfWeek,
    startDate: parsePilloDateInput(data.startDate),
    endDate: data.endDate ? parsePilloDateInput(data.endDate) : null,
    comment: data.comment,
    isActive: data.isActive
  };

  let ruleId = data.id;

  if (data.id) {
    const existingRule = await prisma.pilloScheduleRule.findFirst({
      where: { id: data.id, userId },
      select: { id: true, reminderWorkflowVersion: true }
    });

    if (!existingRule) {
      return { error: 'Правило не найдено' };
    }

    await prisma.pilloScheduleRule.update({
      where: { id: existingRule.id },
      data: {
        ...baseData,
        reminderWorkflowVersion: { increment: 1 }
      }
    });

    await prisma.pilloIntake.deleteMany({
      where: {
        scheduleRuleId: existingRule.id,
        status: PilloIntakeStatus.PENDING,
        scheduledFor: { gte: new Date() }
      }
    });
  } else {
    const rule = await prisma.pilloScheduleRule.create({
      data: {
        userId,
        ...baseData
      },
      select: { id: true }
    });
    ruleId = rule.id;
  }

  if (ruleId) {
    await materializePilloIntakesForRule(ruleId);
  }

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Отключает правило расписания и удаляет будущие pending-приёмы.
 * @param ruleId - идентификатор правила.
 * @returns Результат удаления.
 */
export const deletePilloScheduleRuleAction = async (ruleId: string): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();

  await prisma.pilloScheduleRule.updateMany({
    where: { id: ruleId, userId },
    data: {
      isActive: false,
      reminderWorkflowVersion: { increment: 1 }
    }
  });

  await prisma.pilloIntake.deleteMany({
    where: {
      scheduleRuleId: ruleId,
      userId,
      status: PilloIntakeStatus.PENDING,
      scheduledFor: { gte: new Date() }
    }
  });

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Отмечает приём как принятый.
 * @param intakeId - идентификатор приёма.
 * @returns Результат отметки.
 */
export const takePilloIntakeAction = async (intakeId: string): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();
  const result = await takePilloIntake(userId, intakeId);

  if (!result) {
    return { error: 'Приём не найден' };
  }

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Отмечает приём как пропущенный.
 * @param intakeId - идентификатор приёма.
 * @returns Результат отметки.
 */
export const skipPilloIntakeAction = async (intakeId: string): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();
  const isUpdated = await skipPilloIntake(userId, intakeId);

  if (!isUpdated) {
    return { error: 'Приём не найден или уже обработан' };
  }

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Отменяет последний выбор по приёму.
 * @param intakeId - идентификатор приёма.
 * @returns Результат отмены.
 */
export const undoPilloIntakeAction = async (intakeId: string): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();
  const result = await undoPilloIntake(userId, intakeId);

  if (!result || !result.wasChanged) {
    return { error: 'Приём не найден или отмена невозможна' };
  }

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Сохраняет настройки уведомлений и запасов Pillo.
 * @param input - значения настроек.
 * @returns Результат сохранения.
 */
export const savePilloSettingsAction = async (input: unknown): Promise<PilloActionResult> => {
  const userId = await requirePilloUserId();
  const parsed = pilloSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Некорректные настройки' };
  }

  await prisma.pilloUserSettings.upsert({
    where: { userId },
    update: parsed.data,
    create: { userId, ...parsed.data }
  });

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Подтверждает приём по одноразовому токену из email или push.
 * @param token - открытый токен из ссылки.
 * @returns Результат подтверждения.
 */
export const confirmPilloIntakeTokenAction = async (token: string): Promise<PilloActionResult> => {
  const currentUserId = await requirePilloUserId();
  const tokenHash = hashPilloActionToken(token);
  const actionToken = await prisma.pilloIntakeActionToken.findUnique({
    where: { tokenHash },
    include: { intake: true }
  });

  if (!actionToken || actionToken.usedAt || actionToken.expiresAt <= new Date()) {
    return { error: 'Ссылка недействительна или уже использована' };
  }

  if (actionToken.userId !== currentUserId) {
    return { error: 'Эта ссылка принадлежит другому пользователю' };
  }

  const isAllowed = await canUsePillo(actionToken.userId);
  if (!isAllowed) {
    return { error: 'Нет доступа к Pillo' };
  }

  const result = await takePilloIntake(actionToken.userId, actionToken.intakeId);

  if (!result) {
    return { error: 'Приём не найден' };
  }

  await prisma.pilloIntakeActionToken.update({
    where: { id: actionToken.id },
    data: { usedAt: new Date() }
  });

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Пропускает приём по одноразовому токену из email или push.
 * @param token - открытый токен из ссылки.
 * @returns Результат пропуска.
 */
export const skipPilloIntakeTokenAction = async (token: string): Promise<PilloActionResult> => {
  const currentUserId = await requirePilloUserId();
  const tokenHash = hashPilloActionToken(token);
  const actionToken = await prisma.pilloIntakeActionToken.findUnique({
    where: { tokenHash },
    include: { intake: true }
  });

  if (!actionToken || actionToken.usedAt || actionToken.expiresAt <= new Date()) {
    return { error: 'Ссылка недействительна или уже использована' };
  }

  if (actionToken.userId !== currentUserId) {
    return { error: 'Эта ссылка принадлежит другому пользователю' };
  }

  const isAllowed = await canUsePillo(actionToken.userId);
  if (!isAllowed) {
    return { error: 'Нет доступа к Pillo' };
  }

  const result = await skipPilloIntake(actionToken.userId, actionToken.intakeId);

  if (!result) {
    return { error: 'Приём не найден' };
  }

  await prisma.pilloIntakeActionToken.update({
    where: { id: actionToken.id },
    data: { usedAt: new Date() }
  });

  revalidatePilloPaths();
  return { success: true };
};

/**
 * Материализует ближайшее расписание текущего пользователя.
 * @returns Сводка материализации.
 */
export const refreshPilloWindowAction = async () => {
  const userId = await requirePilloUserId();
  const result = await materializePilloIntakesForUser(userId);

  revalidatePilloPaths();
  return result;
};

/**
 * Загружает фото таблетки в публичный Vercel Blob.
 * @param formData - форма с полем `file`.
 * @returns URL загруженного изображения.
 */
export const uploadPilloMedicationPhotoAction = async (formData: FormData) => {
  const userId = await requirePilloUserId();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return { error: 'Файл не передан' };
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Можно загружать только изображения' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Размер файла не должен превышать 5 МБ' };
  }

  const blob = await put(`pillo/${userId}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type
  });

  return { url: blob.url };
};

/**
 * Удаляет фото таблетки из Vercel Blob.
 * @param url - URL изображения.
 */
export const deletePilloMedicationPhotoAction = async (url: string): Promise<void> => {
  await requirePilloUserId();
  await del(url);
};
