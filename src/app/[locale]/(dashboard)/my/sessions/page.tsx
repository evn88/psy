import { getTranslations } from 'next-intl/server';
import { UserScheduleDashboard } from './_components/user-schedule-dashboard';

export default async function MySessionsPage() {
  const t = await getTranslations('My');

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('sessionsTitle')}</h1>
      </div>
      <UserScheduleDashboard />
    </div>
  );
}
