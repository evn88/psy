import { getTranslations } from 'next-intl/server';
import { UserScheduleDashboard } from './_components/user-schedule-dashboard';

export default async function MySessionsPage() {
  const t = await getTranslations('My');

  return (
    <div className="space-y-4 h-full">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('sessionsTitle')}</h2>
      <UserScheduleDashboard />
    </div>
  );
}
