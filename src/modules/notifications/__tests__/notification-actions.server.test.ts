import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteOne: vi.fn(),
  deleteAll: vi.fn()
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/modules/notifications/notification-service.server', () => ({
  deleteUserNotification: mocks.deleteOne,
  deleteAllUserNotifications: mocks.deleteAll
}));

import {
  deleteAllNotificationsAction,
  deleteNotificationAction
} from '@/modules/notifications/notification-actions.server';

describe('notification actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('запрещает удаление не администратору', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const result = await deleteNotificationAction('notification-1');

    expect(result.success).toBe(false);
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });

  it('удаляет только личное уведомление администратора', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mocks.deleteOne.mockResolvedValue(true);

    const result = await deleteNotificationAction('notification-1');

    expect(result).toEqual({ success: true, deleted: 1 });
    expect(mocks.deleteOne).toHaveBeenCalledWith('admin-1', 'notification-1');
  });

  it('удаляет всю личную историю администратора', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mocks.deleteAll.mockResolvedValue(3);

    const result = await deleteAllNotificationsAction();

    expect(result).toEqual({ success: true, deleted: 3 });
    expect(mocks.deleteAll).toHaveBeenCalledWith('admin-1');
  });
});
