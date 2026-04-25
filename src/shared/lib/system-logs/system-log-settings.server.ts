import 'server-only';

import type { SystemLogSettings } from '@prisma/client';
import prisma from '@/shared/lib/prisma';

const SYSTEM_LOG_SETTINGS_ID = 'default';
const SETTINGS_CACHE_TTL_MS = 5_000;

let cachedSettings: {
  value: SystemLogSettings;
  expiresAt: number;
} | null = null;

/**
 * Сбрасывает in-memory кеш настроек системного журнала.
 */
export const invalidateSystemLogSettingsCache = (): void => {
  cachedSettings = null;
};

/**
 * Возвращает настройки системного журнала, создавая запись по умолчанию при первом обращении.
 * @returns Настройки системного журнала.
 */
export const getSystemLogSettings = async (): Promise<SystemLogSettings> => {
  const now = Date.now();

  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.value;
  }

  const settings = await prisma.systemLogSettings.upsert({
    where: { id: SYSTEM_LOG_SETTINGS_ID },
    update: {},
    create: {
      id: SYSTEM_LOG_SETTINGS_ID,
      apiRequestsEnabled: true,
      aiErrorsEnabled: true,
      paymentErrorsEnabled: true,
      retentionDays: 30
    }
  });

  cachedSettings = {
    value: settings,
    expiresAt: now + SETTINGS_CACHE_TTL_MS
  };

  return settings;
};
