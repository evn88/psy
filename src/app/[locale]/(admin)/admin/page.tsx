import { type ComponentType } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Send,
  Settings,
  UserCheck,
  Users
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { AdminPaymentsLineChart } from './_components/admin-payments-line-chart';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent' | 'warning';
}

interface AdminActionProps {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const AdminStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default'
}: AdminStatCardProps) => {
  const iconClassName =
    tone === 'accent'
      ? 'bg-primary text-primary-foreground'
      : tone === 'warning'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const AdminAction = ({ href, title, description, icon: Icon }: AdminActionProps) => (
  <Button asChild variant="outline" className="h-auto w-full justify-start whitespace-normal p-3">
    <Link href={href} className="flex w-full items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs font-normal leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  </Button>
);

/**
 * Получает статистику пользователей и расписания для дашборда.
 */
const getStats = async () => {
  const OFFLINE_THRESHOLD = 5 * 60 * 1000;
  const activeThreshold = new Date(Date.now() - OFFLINE_THRESHOLD);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const currentYearStart = startOfYear(now);

  const [
    userCount,
    activeSessionsCount,
    waitingUsers,
    upcomingSlotsCount,
    eventsThisWeek,
    bookedUsers,
    freeSlots,
    cancelledEventsCount,
    paymentsThisYear,
    workflowBudgetSnapshot
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        lastSeen: {
          gt: activeThreshold
        }
      }
    }),
    prisma.event.findMany({
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
    }),
    prisma.event.count({
      where: {
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        type: 'CONSULTATION',
        start: { gte: now }
      }
    }),
    prisma.event.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        type: 'CONSULTATION',
        start: { gte: currentWeekStart, lte: currentWeekEnd }
      }
    }),
    prisma.event.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        type: 'CONSULTATION'
      },
      select: { userId: true },
      distinct: ['userId']
    }),
    prisma.event.findMany({
      where: {
        type: 'FREE_SLOT',
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        start: { gte: now }
      }
    }),
    prisma.event.count({
      where: {
        status: 'CANCELLED'
      }
    }),
    prisma.payment.findMany({
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
    }),
    getWorkflowBudgetSnapshot()
  ]);
  const waitingUsersCount = waitingUsers.filter(
    (e: { userId: string | null }) => e.userId !== null
  ).length;

  const scheduledHoursThisWeek = eventsThisWeek.reduce(
    (acc: number, ev: (typeof eventsThisWeek)[number]) => {
      return acc + (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60);
    },
    0
  );

  const bookedUsersCount = bookedUsers.filter(
    (e: { userId: string | null }) => e.userId !== null
  ).length;

  const freeHours = freeSlots.reduce((acc: number, ev: (typeof freeSlots)[number]) => {
    return acc + (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const currentMonthPaymentsTotal = getCurrentMonthPaymentsTotal(paymentsThisYear, now);
  const paymentsYearlySeries = getYearlyPaymentsSeries(paymentsThisYear, now.getFullYear());
  const paymentsCurrency = paymentsThisYear[0]?.currency || getPayPalDefaultCurrency();

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
  const scheduledHours = Math.round(stats.scheduledHoursThisWeek * 10) / 10;
  const freeHours = Math.round(stats.freeHours * 10) / 10;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('dashboardTitle')}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/schedule">{t('openSchedule')}</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/users">{t('manageUsers')}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title={t('usersWaitingTitle')}
          value={stats.waitingUsersCount}
          description={t('usersWaitingDesc')}
          icon={UserCheck}
          tone="accent"
        />
        <AdminStatCard
          title={t('upcomingSlotsTitle')}
          value={stats.upcomingSlotsCount}
          description={t('upcomingSlotsDesc')}
          icon={CalendarCheck}
        />
        <AdminStatCard
          title={t('scheduledHoursTitle')}
          value={scheduledHours}
          description={t('scheduledHoursDesc')}
          icon={Clock}
        />
        <AdminStatCard
          title={t('freeHoursTitle')}
          value={freeHours}
          description={t('freeHoursDesc')}
          icon={CalendarClock}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>{t('paymentsChartTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminPaymentsLineChart
                currency={stats.paymentsCurrency}
                data={stats.paymentsYearlySeries}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminStatCard
              title={t('monthlyPaymentsTitle')}
              value={formatPaymentAmount(stats.currentMonthPaymentsTotal, stats.paymentsCurrency)}
              description={t('monthlyPaymentsDesc')}
              icon={CreditCard}
              tone="accent"
            />
            <AdminStatCard
              title={t('bookedUsersTitle')}
              value={stats.bookedUsersCount}
              description={t('bookedUsersDesc')}
              icon={Users}
            />
            <AdminStatCard
              title={t('cancelledStatsTitle')}
              value={stats.cancelledEventsCount}
              description={t('cancelledStatsDesc')}
              icon={Ban}
              tone="warning"
            />
            <AdminStatCard
              title={t('totalUsers')}
              value={stats.userCount}
              description={t('registeredUsers')}
              icon={Users}
            />
            <AdminStatCard
              title={t('onlineNow')}
              value={stats.activeSessionsCount}
              description={t('activeSessions')}
              icon={Activity}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('quickActionsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <AdminAction
                href="/admin/users"
                title={t('quickActionUsers')}
                description={t('quickActionUsersDesc')}
                icon={Users}
              />
              <AdminAction
                href="/admin/schedule"
                title={t('quickActionSchedule')}
                description={t('quickActionScheduleDesc')}
                icon={CalendarCheck}
              />
              <AdminAction
                href="/admin/send-email"
                title={t('quickActionEmail')}
                description={t('quickActionEmailDesc')}
                icon={Send}
              />
              <AdminAction
                href="/admin/settings"
                title={t('quickActionSettings')}
                description={t('quickActionSettingsDesc')}
                icon={Settings}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('workflowRemainingStepsTitle')}
              </CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {numberFormatter.format(stats.workflowBudgetSnapshot.remainingSteps)}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('workflowRemainingStepsDesc', {
                  period: stats.workflowBudgetSnapshot.periodKey,
                  used: numberFormatter.format(stats.workflowBudgetSnapshot.estimatedSteps),
                  limit: numberFormatter.format(stats.workflowBudgetSnapshot.monthlyStepLimit)
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('workflowSentNotificationsTitle')}
              </CardTitle>
              <BellRing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {numberFormatter.format(stats.workflowBudgetSnapshot.totalSentNotifications)}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
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
        </aside>
      </div>
    </div>
  );
}
