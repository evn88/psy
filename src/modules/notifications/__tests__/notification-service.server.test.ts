import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  upsertNotification: vi.fn(),
  createNotification: vi.fn(),
  createManyNotifications: vi.fn(),
  findNotifications: vi.fn(),
  updateNotifications: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findUnique: prismaMocks.findUser },
    appNotification: {
      upsert: prismaMocks.upsertNotification,
      create: prismaMocks.createNotification,
      createMany: prismaMocks.createManyNotifications,
      findMany: prismaMocks.findNotifications,
      updateMany: prismaMocks.updateNotifications
    }
  }
}));

import {
  createUserNotification,
  deleteAllUserNotifications,
  deleteUserNotification,
  ensureSystemNotifications,
  getUserNotificationsHistory,
  systemNotificationKeys
} from '@/modules/notifications/notification-service.server';

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.upsertNotification.mockResolvedValue({ id: 'notification-1' });
  });

  it('создаёт уведомления о таймзоне и первичной анкете для пользователя', async () => {
    prismaMocks.findUser.mockResolvedValue({
      role: 'USER',
      language: 'ru',
      timezone: null,
      clientProfile: { intakes: [] },
      appNotifications: []
    });

    await ensureSystemNotifications('user-1');

    expect(prismaMocks.upsertNotification).toHaveBeenCalledTimes(2);
    expect(prismaMocks.upsertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: `user-1:${systemNotificationKeys.missingTimezone}` }
      })
    );
    expect(prismaMocks.upsertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: `user-1:${systemNotificationKeys.incompleteIntake}` }
      })
    );
  });

  it('не создаёт системные уведомления при заполненном профиле', async () => {
    prismaMocks.findUser.mockResolvedValue({
      role: 'USER',
      language: 'ru',
      timezone: 'Europe/Belgrade',
      clientProfile: { intakes: [{ id: 'intake-1' }] },
      appNotifications: [
        {
          dedupeKey: `user-1:${systemNotificationKeys.missingTimezone}`,
          readAt: null,
          dismissedAt: null,
          deletedAt: null
        },
        {
          dedupeKey: `user-1:${systemNotificationKeys.incompleteIntake}`,
          readAt: null,
          dismissedAt: null,
          deletedAt: null
        }
      ]
    });

    await ensureSystemNotifications('user-1');

    expect(prismaMocks.upsertNotification).not.toHaveBeenCalled();
    expect(prismaMocks.updateNotifications).toHaveBeenCalledTimes(2);
    expect(prismaMocks.updateNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dedupeKey: `user-1:${systemNotificationKeys.missingTimezone}`
        })
      })
    );
    expect(prismaMocks.updateNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dedupeKey: `user-1:${systemNotificationKeys.incompleteIntake}`
        })
      })
    );
  });

  it('не выполняет повторную запись для уже созданных системных уведомлений', async () => {
    prismaMocks.findUser.mockResolvedValue({
      role: 'USER',
      language: 'ru',
      timezone: null,
      clientProfile: { intakes: [] },
      appNotifications: [
        {
          dedupeKey: `user-1:${systemNotificationKeys.missingTimezone}`,
          readAt: null,
          dismissedAt: null,
          deletedAt: null
        },
        {
          dedupeKey: `user-1:${systemNotificationKeys.incompleteIntake}`,
          readAt: new Date(),
          dismissedAt: null,
          deletedAt: null
        }
      ]
    });

    await ensureSystemNotifications('user-1');

    expect(prismaMocks.upsertNotification).not.toHaveBeenCalled();
    expect(prismaMocks.updateNotifications).not.toHaveBeenCalled();
  });

  it('не сбрасывает прочитанное состояние при дедупликации', async () => {
    await createUserNotification({
      userId: 'user-1',
      dedupeKey: 'module:event:v1',
      source: 'TEST',
      title: 'Заголовок',
      message: 'Сообщение'
    });

    expect(prismaMocks.upsertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({
          readAt: expect.anything(),
          dismissedAt: expect.anything()
        })
      })
    );
  });

  it('возвращает историю с курсором и сериализованными датами', async () => {
    const createdAt = new Date('2026-07-16T12:00:00.000Z');
    prismaMocks.findNotifications.mockResolvedValue(
      ['notification-1', 'notification-2', 'notification-3'].map(id => ({
        id,
        kind: 'INFO',
        source: 'TEST',
        title: id,
        message: 'Сообщение',
        actionUrl: null,
        actionLabel: null,
        readAt: createdAt,
        dismissedAt: null,
        createdAt
      }))
    );

    const result = await getUserNotificationsHistory('user-1', undefined, 2);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.createdAt).toBe(createdAt.toISOString());
    expect(result.items[0]?.readAt).toBe(createdAt.toISOString());
    expect(result.nextCursor).toBe('notification-2');
    expect(prismaMocks.findNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', deletedAt: null }, take: 3 })
    );
  });

  it('удаляет только историю указанного пользователя', async () => {
    prismaMocks.updateNotifications.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({
      count: 4
    });

    const wasDeleted = await deleteUserNotification('user-1', 'notification-1');
    const deletedCount = await deleteAllUserNotifications('user-1');

    expect(wasDeleted).toBe(true);
    expect(deletedCount).toBe(4);
    expect(prismaMocks.updateNotifications).toHaveBeenNthCalledWith(1, {
      where: { id: 'notification-1', userId: 'user-1', deletedAt: null },
      data: { deletedAt: expect.any(Date) }
    });
    expect(prismaMocks.updateNotifications).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', deletedAt: null },
      data: { deletedAt: expect.any(Date) }
    });
  });
});
