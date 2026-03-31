import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/shared/lib/prisma';
import { Activity, Ban, CalendarCheck, CalendarClock, Clock, UserCheck, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

/**
 * Получает статистику пользователей и расписания для дашборда.
 */
const getStats = async () => {
  const userCount = await prisma.user.count();

  const OFFLINE_THRESHOLD = 5 * 60 * 1000;
  const activeThreshold = new Date(Date.now() - OFFLINE_THRESHOLD);

  const activeSessionsCount = await prisma.user.count({
    where: {
      lastSeen: {
        gt: activeThreshold
      }
    }
  });

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Users waiting for a session this month
  const waitingUsers = await prisma.event.findMany({
    where: {
      status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
      type: 'CONSULTATION',
      start: {
        gte: currentMonthStart,
        lte: currentMonthEnd
      }
    },
    select: { userId: true },
    distinct: ['userId']
  });
  const waitingUsersCount = waitingUsers.filter(
    (e: { userId: string | null }) => e.userId !== null
  ).length;

  // Upcoming scheduled slots
  const upcomingSlotsCount = await prisma.event.count({
    where: {
      status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
      type: 'CONSULTATION',
      start: { gte: now }
    }
  });

  // Hours scheduled for this week
  const eventsThisWeek = await prisma.event.findMany({
    where: {
      status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
      type: 'CONSULTATION',
      start: { gte: currentWeekStart, lte: currentWeekEnd }
    }
  });
  const scheduledHoursThisWeek = eventsThisWeek.reduce(
    (acc: number, ev: (typeof eventsThisWeek)[number]) => {
      return acc + (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60);
    },
    0
  );

  // Users who booked time (all-time)
  const bookedUsers = await prisma.event.findMany({
    where: {
      status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
      type: 'CONSULTATION'
    },
    select: { userId: true },
    distinct: ['userId']
  });
  const bookedUsersCount = bookedUsers.filter(
    (e: { userId: string | null }) => e.userId !== null
  ).length;

  // Free hours for booking
  const freeSlots = await prisma.event.findMany({
    where: {
      type: 'FREE_SLOT',
      status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
      start: { gte: now }
    }
  });
  const freeHours = freeSlots.reduce((acc: number, ev: (typeof freeSlots)[number]) => {
    return acc + (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60);
  }, 0);

  // Cancelled events
  const cancelledEventsCount = await prisma.event.count({
    where: {
      status: 'CANCELLED'
    }
  });

  return {
    userCount,
    activeSessionsCount,
    waitingUsersCount,
    upcomingSlotsCount,
    scheduledHoursThisWeek,
    bookedUsersCount,
    freeHours,
    cancelledEventsCount
  };
};

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const t = await getTranslations('Admin');

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">{t('dashboardTitle')}</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('usersWaitingTitle')}</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitingUsersCount}</div>
            <p className="text-xs text-muted-foreground">{t('usersWaitingDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('upcomingSlotsTitle')}</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingSlotsCount}</div>
            <p className="text-xs text-muted-foreground">{t('upcomingSlotsDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('scheduledHoursTitle')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.scheduledHoursThisWeek * 10) / 10}
            </div>
            <p className="text-xs text-muted-foreground">{t('scheduledHoursDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('bookedUsersTitle')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookedUsersCount}</div>
            <p className="text-xs text-muted-foreground">{t('bookedUsersDesc')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('freeHoursTitle')}</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.freeHours * 10) / 10}</div>
            <p className="text-xs text-muted-foreground">{t('freeHoursDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cancelledStatsTitle')}</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledEventsCount}</div>
            <p className="text-xs text-muted-foreground">{t('cancelledStatsDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground">{t('registeredUsers')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('onlineNow')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessionsCount}</div>
            <p className="text-xs text-muted-foreground">{t('activeSessions')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
