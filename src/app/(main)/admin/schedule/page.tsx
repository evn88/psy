import { ScheduleDashboard } from './_components/schedule-dashboard';
import { SyncSettingsDialog } from './_components/sync-settings-dialog';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

export default async function SchedulePage() {
  const session = await auth();
  let syncUrl = '';
  let syncEnabled = false;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { googleCalendarSyncUrl: true, googleCalendarSyncEnabled: true }
    });
    syncUrl = user?.googleCalendarSyncUrl || '';
    syncEnabled = user?.googleCalendarSyncEnabled || false;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Schedule</h2>
        <SyncSettingsDialog initialUrl={syncUrl} initialEnabled={syncEnabled} />
      </div>
      <ScheduleDashboard />
    </div>
  );
}
