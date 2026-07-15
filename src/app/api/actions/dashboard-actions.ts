'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getPaymentsSeriesForPeriod, getPaymentsTotalForPeriod } from '@/modules/payments';
import { getPayPalDefaultCurrency } from '@/modules/payments/paypal/config';
import { getWorkflowBudgetSnapshot } from '@/lib/workflow-budget';
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
import { parseDashboardPeriod } from '@/lib/dashboard-period';

export async function getAdminDashboardStats(periodInput: unknown) {
  const session = await auth();
  const user = requireAuthenticatedUser(session?.user, defaultLocale);

  if (user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const OFFLINE_THRESHOLD = 5 * 60 * 1000;
  const activeThreshold = new Date(Date.now() - OFFLINE_THRESHOLD);

  const { from, to } = parseDashboardPeriod(periodInput);

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
        start: { gte: from, lte: to }
      },
      select: { userId: true },
      distinct: ['userId']
    }),
    prisma.event.count({
      where: {
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        type: 'CONSULTATION',
        start: { gte: from, lte: to }
      }
    }),
    prisma.event.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        type: 'CONSULTATION',
        start: { gte: from, lte: to }
      }
    }),
    prisma.event.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        type: 'CONSULTATION',
        start: { gte: from, lte: to }
      },
      select: { userId: true },
      distinct: ['userId']
    }),
    prisma.event.findMany({
      where: {
        type: 'FREE_SLOT',
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        start: { gte: from, lte: to }
      }
    }),
    prisma.event.count({
      where: {
        status: 'CANCELLED',
        start: { gte: from, lte: to }
      }
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          {
            capturedAt: {
              gte: from,
              lte: to
            }
          },
          {
            createdAt: {
              gte: from,
              lte: to
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
        createdAt: { gte: from, lte: to }
      }
    }),
    prisma.systemLogEntry.count({
      where: {
        level: 'ERROR',
        createdAt: { gte: from, lte: to }
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
        result: { completedAt: { gte: from, lte: to } }
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

  const periodPaymentsTotal = getPaymentsTotalForPeriod(paymentsThisYear, from, to);
  const paymentsPeriodSeries = getPaymentsSeriesForPeriod(paymentsThisYear, from, to);
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
    periodPaymentsTotal,
    paymentsPeriodSeries,
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

export async function getClientDashboardStats(periodInput: unknown) {
  const session = await auth();
  const user = requireAuthenticatedUser(session?.user, defaultLocale);

  if (user.role === 'GUEST') {
    throw new Error('Unauthorized');
  }

  const { from, to } = parseDashboardPeriod(periodInput);
  const now = new Date();
  const nextSessionFrom = from > now ? from : now;

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
        status: 'COMPLETED',
        result: { completedAt: { gte: from, lte: to } }
      }
    }),
    prisma.event.findFirst({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        start: {
          gte: nextSessionFrom,
          lte: to
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
