import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { NotificationsHistory } from '@/components/notifications-history';
import {
  ensureSystemNotifications,
  getUserNotificationsHistory
} from '@/modules/notifications/notification-service.server';

/** Показывает историю уведомлений администратора с возможностью удаления. */
const AdminNotificationsPage = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth');
  }
  if (session.user.role !== 'ADMIN') {
    redirect('/my');
  }

  await ensureSystemNotifications(session.user.id);
  const initialPage = await getUserNotificationsHistory(session.user.id);
  return <NotificationsHistory initialPage={initialPage} isAdmin />;
};

export default AdminNotificationsPage;
