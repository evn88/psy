'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getCurrentMonthPaymentsTotal, getYearlyPaymentsSeries } from '@/modules/payments';
import { getPayPalDefaultCurrency } from '@/modules/payments/paypal/config';
import { getWorkflowBudgetSnapshot } from '@/lib/workflow-budget';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';
import { defaultLocale } from '@/i18n/config';
import { Prisma } from '@prisma/client';
import {
  ADMIN_WIDGET_TYPES,
  CLIENT_WIDGET_TYPES,
  getScopedDashboardConfig,
  parseDashboardConfig,
  setScopedDashboardConfig,
  type DashboardScope
} from '@/lib/dashboard-config';

export async function getAdminDashboardStats() {
  const session = await auth();
  const user = requireAuthenticatedUser(session?.user, defaultLocale);

  if (user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const OFFLINE_THRESHOLD = 5 * 60 * 1000;
  const activeThreshold = new Date(Date.now() - OFFLINE_THRESHOLD);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const currentYearStart = startOfYear(now);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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
    workflowBudgetSnapshot,
    dbUser,
    newUsersCount,
    systemErrorsCount,
    paymentDisputesCount,
    completedSurveysCount
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
    getWorkflowBudgetSnapshot(),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { dashboardConfig: true }
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    }),
    prisma.systemLogEntry.count({
      where: {
        level: 'ERROR',
        createdAt: { gte: sevenDaysAgo }
      }
    }),
    prisma.paymentDispute.count({
      where: {
        status: { in: ['OPEN', 'UNDER_REVIEW', 'REQUIRES_ACTION'] }
      }
    }),
    prisma.surveyAssignment.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: sevenDaysAgo }
      }
    })
  ]);

  const waitingUsersCount = waitingUsers.filter(
    (e: { userId: string | null }) => e.userId !== null
  ).length;

  const scheduledHoursThisWeek = eventsThisWeek.reduce(
    (acc: number, ev: { start: Date; end: Date }) => {
      return acc + (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60);
    },
    0
  );

  const bookedUsersCount = bookedUsers.filter(
    (e: { userId: string | null }) => e.userId !== null
  ).length;

  const freeHours = freeSlots.reduce((acc: number, ev: { start: Date; end: Date }) => {
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
    workflowBudgetSnapshot,
    newUsersCount,
    systemErrorsCount,
    paymentDisputesCount,
    completedSurveysCount,
    dashboardConfig: getScopedDashboardConfig(dbUser?.dashboardConfig, 'admin'),
    userId: user.id
  };
}

export async function getClientDashboardStats() {
  const session = await auth();
  const user = requireAuthenticatedUser(session?.user, defaultLocale);

  if (user.role === 'GUEST') {
    throw new Error('Unauthorized');
  }

  const now = new Date();

  const [pendingSurveys, completedSurveys, nextSession, dbUser] = await Promise.all([
    prisma.surveyAssignment.count({
      where: {
        userId: user.id,
        status: 'PENDING'
      }
    }),
    prisma.surveyAssignment.count({
      where: {
        userId: user.id,
        status: 'COMPLETED'
      }
    }),
    prisma.event.findFirst({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        start: {
          gte: now
        }
      },
      orderBy: {
        start: 'asc'
      }
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        timezone: true,
        language: true,
        dashboardConfig: true,
        name: true,
        email: true,
        balance: true,
        _count: { select: { documents: true } }
      }
    })
  ]);

  return {
    pendingSurveys,
    completedSurveys,
    nextSessionTitle: nextSession?.title || null,
    nextSessionStart: nextSession?.start?.toISOString() || null,
    userTimezone: dbUser?.timezone || 'UTC',
    userLanguage: dbUser?.language || 'ru',
    userName: dbUser?.name || dbUser?.email || '',
    userEmail: dbUser?.email || '',
    dashboardConfig: getScopedDashboardConfig(dbUser?.dashboardConfig, 'client'),
    balance: dbUser?.balance ? Number(dbUser.balance) : 0,
    filesCount: dbUser?._count?.documents || 0,
    userId: user.id
  };
}

const saveDashboardConfig = async (scope: DashboardScope, config: unknown) => {
  const session = await auth();
  const user = requireAuthenticatedUser(session?.user, defaultLocale);

  if (user.role === 'GUEST' || (scope === 'admin' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized');
  }

  const allowedTypes = scope === 'admin' ? ADMIN_WIDGET_TYPES : CLIENT_WIDGET_TYPES;
  const parsedConfig = parseDashboardConfig(config, allowedTypes);

  if (!parsedConfig) {
    throw new Error('Invalid dashboard config');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { dashboardConfig: true }
  });
  const dashboardConfig = setScopedDashboardConfig(dbUser?.dashboardConfig, scope, parsedConfig);

  await prisma.user.update({
    where: { id: user.id },
    data: { dashboardConfig: dashboardConfig as Prisma.InputJsonValue }
  });

  return { success: true };
};

/** Сохраняет раскладку административного дашборда. */
export async function saveAdminDashboardConfig(config: unknown) {
  return saveDashboardConfig('admin', config);
}

/** Сохраняет раскладку личного кабинета. */
export async function saveClientDashboardConfig(config: unknown) {
  return saveDashboardConfig('client', config);
}
