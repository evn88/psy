import { ScheduleDashboard } from './_components/schedule-dashboard';
import { SyncSettingsDialog } from './_components/sync-settings-dialog';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export default async function SchedulePage({
  searchParams
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const session = await auth();
  const { google: googleStatus } = await searchParams;
  let googleConnected = false;
  let calendarName: string | null = null;
  let workStart = 9;
  let workEnd = 20;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarRefreshToken: true,
        googleCalendarName: true,
        workHourStart: true,
        workHourEnd: true
      }
    });
    googleConnected = Boolean(user?.googleCalendarSyncEnabled && user.googleCalendarRefreshToken);
    calendarName = user?.googleCalendarName || null;
    if (user?.workHourStart !== undefined) workStart = user.workHourStart;
    if (user?.workHourEnd !== undefined) workEnd = user.workHourEnd;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Schedule</h2>
        <SyncSettingsDialog
          initialConnected={googleConnected}
          calendarName={calendarName}
          googleStatus={googleStatus}
          initialWorkStart={workStart}
          initialWorkEnd={workEnd}
        />
      </div>
      <ScheduleDashboard workHourStart={workStart} workHourEnd={workEnd} />
    </div>
  );
}
