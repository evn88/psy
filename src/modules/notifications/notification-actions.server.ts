'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import {
  deleteAllUserNotifications,
  deleteUserNotification
} from '@/modules/notifications/notification-service.server';

type DeleteNotificationResult =
  | { success: true; deleted: number }
  | { success: false; message: string };

const notificationIdSchema = z.string().trim().min(1).max(100);

/** Удаляет одно уведомление из личной истории текущего администратора. */
export async function deleteNotificationAction(
  notificationId: string
): Promise<DeleteNotificationResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, message: 'Forbidden' };
  }

  const idResult = notificationIdSchema.safeParse(notificationId);
  if (!idResult.success) {
    return { success: false, message: 'Invalid notification id' };
  }

  const wasDeleted = await deleteUserNotification(session.user.id, idResult.data);
  return wasDeleted
    ? { success: true, deleted: 1 }
    : { success: false, message: 'Notification not found' };
}

/** Удаляет всю личную историю уведомлений текущего администратора. */
export async function deleteAllNotificationsAction(): Promise<DeleteNotificationResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, message: 'Forbidden' };
  }

  const deleted = await deleteAllUserNotifications(session.user.id);
  return { success: true, deleted };
}
