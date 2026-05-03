import { ScheduleDashboard } from './_components/schedule-dashboard';
import { SyncSettingsDialog } from './_components/sync-settings-dialog';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export default async function SchedulePage() {
  const session = await auth();
  let syncUrl = '';
  let syncEnabled = false;
  let workStart = 9;
  let workEnd = 20;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        googleCalendarSyncUrl: true,
        googleCalendarSyncEnabled: true,
        workHourStart: true,
        workHourEnd: true
      }
    });
    syncUrl = user?.googleCalendarSyncUrl || '';
    syncEnabled = user?.googleCalendarSyncEnabled || false;
    if (user?.workHourStart !== undefined) workStart = user.workHourStart;
    if (user?.workHourEnd !== undefined) workEnd = user.workHourEnd;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Schedule</h2>
        <SyncSettingsDialog
          initialUrl={syncUrl}
          initialEnabled={syncEnabled}
          initialWorkStart={workStart}
          initialWorkEnd={workEnd}
        />
      </div>
      <ScheduleDashboard workHourStart={workStart} workHourEnd={workEnd} />
    </div>
  );
}
