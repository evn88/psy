import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/prisma';
import {
  formatPaymentAmount,
  getCurrentMonthPaymentsTotal,
  getYearlyPaymentsSeries
} from '@/modules/payments';
import { getPayPalDefaultCurrency } from '@/modules/payments/paypal/config';
import { getWorkflowBudgetSnapshot } from '@/lib/workflow-budget';
import {
  Activity,
  Ban,
  BellRing,
  CalendarCheck,
  CalendarClock,
  Clock,
  CreditCard,
  Gauge,
  UserCheck,
  Users
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { AdminPaymentsLineChart } from './_components/admin-payments-line-chart';

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
  const currentYearStart = startOfYear(now);

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

  const paymentsThisYear = await prisma.payment.findMany({
    where: {
      OR: [
        {
          capturedAt: {
            gte: currentYearStart
          }
        },
        {
          createdAt: {
            gte: currentYearStart
          }
        }
      ]
    },
    select: {
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      capturedAt: true
    }
  });

  const currentMonthPaymentsTotal = getCurrentMonthPaymentsTotal(paymentsThisYear, now);
  const paymentsYearlySeries = getYearlyPaymentsSeries(paymentsThisYear, now.getFullYear());
  const paymentsCurrency = paymentsThisYear[0]?.currency || getPayPalDefaultCurrency();

  const workflowBudgetSnapshot = await getWorkflowBudgetSnapshot();

  return {
    userCount,
    activeSessionsCount,
    waitingUsersCount,
    upcomingSlotsCount,
    scheduledHoursThisWeek,
    bookedUsersCount,
    freeHours,
    cancelledEventsCount,
    currentMonthPaymentsTotal,
    paymentsYearlySeries,
    paymentsCurrency,
    workflowBudgetSnapshot
  };
};

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const t = await getTranslations('Admin');
  const numberFormatter = new Intl.NumberFormat();

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
            <CardTitle className="text-sm font-medium">Платежи за месяц</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPaymentAmount(stats.currentMonthPaymentsTotal, stats.paymentsCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Сумма подтверждённых оплат от всех клиентов
            </p>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Оплаты по месяцам</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminPaymentsLineChart
            currency={stats.paymentsCurrency}
            data={stats.paymentsYearlySeries}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('workflowRemainingStepsTitle')}
            </CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numberFormatter.format(stats.workflowBudgetSnapshot.remainingSteps)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('workflowRemainingStepsDesc', {
                period: stats.workflowBudgetSnapshot.periodKey,
                used: numberFormatter.format(stats.workflowBudgetSnapshot.estimatedSteps),
                limit: numberFormatter.format(stats.workflowBudgetSnapshot.monthlyStepLimit)
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('workflowSentNotificationsTitle')}
            </CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numberFormatter.format(stats.workflowBudgetSnapshot.totalSentNotifications)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('workflowSentNotificationsDesc', {
                email: numberFormatter.format(stats.workflowBudgetSnapshot.reminderEmailCount),
                push: numberFormatter.format(stats.workflowBudgetSnapshot.reminderPushCount),
                alerts: numberFormatter.format(
                  stats.workflowBudgetSnapshot.adminAlertEmailSentCount
                )
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
