import { ScheduleDashboard } from './_components/schedule-dashboard';
import { SyncSettingsDialog } from './_components/sync-settings-dialog';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

export default async function SchedulePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const session = await auth();
  const [{ google: googleStatus }, { locale }] = await Promise.all([searchParams, params]);
  const t = await getTranslations({ locale, namespace: 'Schedule' });
  let googleConnected = false;
  let calendarName: string | null = null;
  let googleCalendarSyncUrl: string | null = null;
  let workStart = 9;
  let workEnd = 20;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarRefreshToken: true,
        googleCalendarName: true,
        googleCalendarSyncUrl: true,
        workHourStart: true,
        workHourEnd: true
      }
    });
    googleConnected = Boolean(user?.googleCalendarSyncEnabled && user.googleCalendarRefreshToken);
    calendarName = user?.googleCalendarName || null;
    googleCalendarSyncUrl = user?.googleCalendarSyncUrl || null;
    if (user?.workHourStart !== undefined) workStart = user.workHourStart;
    if (user?.workHourEnd !== undefined) workEnd = user.workHourEnd;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h2>
        <SyncSettingsDialog
          initialConnected={googleConnected}
          calendarName={calendarName}
          initialGoogleCalendarSyncUrl={googleCalendarSyncUrl}
          googleStatus={googleStatus}
          initialWorkStart={workStart}
          initialWorkEnd={workEnd}
        />
      </div>
      <ScheduleDashboard workHourStart={workStart} workHourEnd={workEnd} />
    </div>
  );
}
