import { auth } from '@/auth';
import { NotificationsHistory } from '@/components/notifications-history';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import {
  ensureSystemNotifications,
  getUserNotificationsHistory
} from '@/modules/notifications/notification-service.server';

interface MyNotificationsPageProps {
  params: Promise<{ locale: string }>;
}

/** Показывает полную историю уведомлений текущего пользователя. */
const MyNotificationsPage = async ({ params }: MyNotificationsPageProps) => {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect({ href: '/auth', locale: currentLocale });
    return null;
  }

  await ensureSystemNotifications(userId);
  const initialPage = await getUserNotificationsHistory(userId);
  return <NotificationsHistory initialPage={initialPage} />;
};

export default MyNotificationsPage;
