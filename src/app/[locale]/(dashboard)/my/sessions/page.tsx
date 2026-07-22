import { getTranslations } from 'next-intl/server';
import { UserScheduleDashboard } from './_components/user-schedule-dashboard';
import { CalendarDays, Sparkles } from 'lucide-react';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { resolveScheduleTimeZone } from '@/lib/schedule-timezone';

export default async function MySessionsPage() {
  const [t, session] = await Promise.all([getTranslations('My'), auth()]);
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { timezone: true }
      })
    : null;
  const userTimezone = resolveScheduleTimeZone(dbUser?.timezone);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Premium Hero-блок */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t('sessionsTitle')}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('actionSessionsTitle')}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('actionSessionsDesc')}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <CalendarDays className="h-7 w-7" />
          </div>
        </div>
      </div>

      <UserScheduleDashboard userTimezone={userTimezone} />
    </div>
  );
}
