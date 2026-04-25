import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemLogCategory, SystemLogLevel } from '@prisma/client';

const prismaMocks = vi.hoisted(() => ({
  create: vi.fn(),
  upsert: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/shared/lib/prisma', () => ({
  default: {
    systemLogEntry: {
      create: prismaMocks.create
    },
    systemLogSettings: {
      upsert: prismaMocks.upsert
    }
  }
}));

import { writeSystemLogEntry } from '../system-log-service.server';
import { invalidateSystemLogSettingsCache } from '../system-log-settings.server';

describe('writeSystemLogEntry', () => {
  beforeEach(() => {
    // Arrange
    vi.clearAllMocks();
    invalidateSystemLogSettingsCache();
    prismaMocks.upsert.mockResolvedValue({
      id: 'default',
      apiRequestsEnabled: true,
      aiErrorsEnabled: true,
      paymentErrorsEnabled: true,
      retentionDays: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  it('не выбрасывает ошибку наружу при падении записи в БД', async () => {
    // Arrange
    prismaMocks.create.mockRejectedValue(new Error('DB is unavailable'));

    // Act
    const action = writeSystemLogEntry({
      category: SystemLogCategory.API,
      level: SystemLogLevel.ERROR,
      source: 'test'
    });

    // Assert
    await expect(action).resolves.toBeUndefined();
    expect(prismaMocks.create).toHaveBeenCalledTimes(1);
  });

  it('не создаёт запись для выключенной категории', async () => {
    // Arrange
    prismaMocks.upsert.mockResolvedValue({
      id: 'default',
      apiRequestsEnabled: false,
      aiErrorsEnabled: true,
      paymentErrorsEnabled: true,
      retentionDays: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Act
    await writeSystemLogEntry({
      category: SystemLogCategory.API,
      level: SystemLogLevel.INFO,
      source: 'test'
    });

    // Assert
    expect(prismaMocks.create).not.toHaveBeenCalled();
  });
});
