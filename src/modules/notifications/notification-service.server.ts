import 'server-only';

import prisma from '@/lib/prisma';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { notificationContentSchema } from '@/modules/notifications/schemas';
import type {
  AppNotificationDto,
  AppNotificationHistoryDto,
  AppNotificationHistoryPage,
  CreateNotificationContent
} from '@/modules/notifications/types';

export const systemNotificationKeys = {
  missingTimezone: 'account:missing-timezone:v1',
  incompleteIntake: 'intake:incomplete:v1'
} as const;

interface CreateUserNotificationInput extends CreateNotificationContent {
  userId: string;
  dedupeKey?: string;
}

interface SystemNotificationState {
  dedupeKey: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  deletedAt: Date | null;
}

const systemCopy: Record<
  AppLocale,
  {
    timezone: { title: string; message: string; actionLabel: string };
    intake: { title: string; message: string; actionLabel: string };
  }
> = {
  ru: {
    timezone: {
      title: 'Укажите часовой пояс',
      message: 'Он нужен, чтобы расписание и напоминания приходили в корректное местное время.',
      actionLabel: 'Перейти в профиль'
    },
    intake: {
      title: 'Заполните первичную анкету',
      message: 'Анкета поможет подготовиться к первой консультации и лучше понять ваш запрос.',
      actionLabel: 'Открыть анкету'
    }
  },
  en: {
    timezone: {
      title: 'Set your timezone',
      message: 'It is required to show the schedule and send reminders at the correct local time.',
      actionLabel: 'Open profile'
    },
    intake: {
      title: 'Complete the initial questionnaire',
      message:
        'The questionnaire helps prepare for your first consultation and understand your request.',
      actionLabel: 'Open questionnaire'
    }
  },
  sr: {
    timezone: {
      title: 'Podesite vremensku zonu',
      message: 'Potrebna je da bi raspored i podsetnici stizali u tačno lokalno vreme.',
      actionLabel: 'Otvori profil'
    },
    intake: {
      title: 'Popunite početni upitnik',
      message: 'Upitnik pomaže u pripremi prve konsultacije i boljem razumevanju vašeg zahteva.',
      actionLabel: 'Otvori upitnik'
    }
  }
};

const toNotificationDto = (notification: {
  id: string;
  kind: 'INFO' | 'WARNING' | 'SUCCESS';
  source: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: Date;
}): AppNotificationDto => ({
  ...notification,
  createdAt: notification.createdAt.toISOString()
});

const toNotificationHistoryDto = (notification: {
  id: string;
  kind: 'INFO' | 'WARNING' | 'SUCCESS';
  source: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
}): AppNotificationHistoryDto => ({
  ...notification,
  readAt: notification.readAt?.toISOString() ?? null,
  dismissedAt: notification.dismissedAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString()
});

/**
 * Создаёт persistent-уведомление для пользователя.
 * `dedupeKey` не создаёт дубликат и не сбрасывает уже прочитанное состояние.
 * @param input - получатель, содержимое и необязательный ключ дедупликации.
 * @returns Созданное или ранее существовавшее уведомление.
 */
export const createUserNotification = async (input: CreateUserNotificationInput) => {
  const content = notificationContentSchema.parse(input);
  const dedupeKey = input.dedupeKey ? `${input.userId}:${input.dedupeKey}` : null;
  const data = {
    userId: input.userId,
    kind: content.kind,
    source: content.source,
    title: content.title,
    message: content.message,
    actionUrl: content.actionUrl || null,
    actionLabel: content.actionLabel || null
  };

  if (!dedupeKey) {
    return prisma.appNotification.create({ data });
  }

  return prisma.appNotification.upsert({
    where: { dedupeKey },
    create: { ...data, dedupeKey },
    update: {
      kind: data.kind,
      source: data.source,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel
    }
  });
};

/**
 * Создаёт одинаковое уведомление группе пользователей одной операцией.
 * @param userIds - уникальные идентификаторы получателей.
 * @param contentInput - содержимое уведомления.
 * @returns Количество созданных записей.
 */
export const createNotificationsForUsers = async (
  userIds: string[],
  contentInput: CreateNotificationContent
): Promise<number> => {
  const content = notificationContentSchema.parse(contentInput);
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return 0;
  }

  const result = await prisma.appNotification.createMany({
    data: uniqueUserIds.map(userId => ({
      userId,
      kind: content.kind,
      source: content.source,
      title: content.title,
      message: content.message,
      actionUrl: content.actionUrl || null,
      actionLabel: content.actionLabel || null
    }))
  });

  return result.count;
};

/**
 * Гарантирует наличие системных уведомлений, актуальных для профиля пользователя.
 * Уже прочитанные или очищенные записи не создаются повторно благодаря dedupe key.
 * @param userId - идентификатор текущего пользователя.
 */
export const ensureSystemNotifications = async (userId: string): Promise<void> => {
  const missingTimezoneDedupeKey = `${userId}:${systemNotificationKeys.missingTimezone}`;
  const incompleteIntakeDedupeKey = `${userId}:${systemNotificationKeys.incompleteIntake}`;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      language: true,
      timezone: true,
      clientProfile: {
        select: {
          intakes: {
            where: { status: 'COMPLETED' },
            select: { id: true },
            take: 1
          }
        }
      },
      appNotifications: {
        where: {
          dedupeKey: { in: [missingTimezoneDedupeKey, incompleteIntakeDedupeKey] }
        },
        select: {
          dedupeKey: true,
          readAt: true,
          dismissedAt: true,
          deletedAt: true
        }
      }
    }
  });

  if (!user) {
    return;
  }

  const userLanguage = String(user.language);
  const locale: AppLocale = isLocale(userLanguage) ? userLanguage : defaultLocale;
  const copy = systemCopy[locale];
  const notifications: Promise<unknown>[] = [];
  const systemNotifications = new Map<string, SystemNotificationState>();
  user.appNotifications.forEach((notification: SystemNotificationState) => {
    if (notification.dedupeKey) {
      systemNotifications.set(notification.dedupeKey, notification);
    }
  });
  const hasNotification = (dedupeKey: string): boolean => systemNotifications.has(dedupeKey);
  const isNotificationActive = (dedupeKey: string): boolean => {
    const notification = systemNotifications.get(dedupeKey);
    return Boolean(
      notification && !notification.readAt && !notification.dismissedAt && !notification.deletedAt
    );
  };

  if (!user.timezone && !hasNotification(missingTimezoneDedupeKey)) {
    notifications.push(
      createUserNotification({
        userId,
        dedupeKey: systemNotificationKeys.missingTimezone,
        kind: 'WARNING',
        source: 'ACCOUNT',
        title: copy.timezone.title,
        message: copy.timezone.message,
        actionUrl: user.role === 'ADMIN' ? '/admin/profile' : '/my/profile',
        actionLabel: copy.timezone.actionLabel
      })
    );
  } else if (user.timezone && isNotificationActive(missingTimezoneDedupeKey)) {
    notifications.push(
      resolveUserNotificationByKey(userId, systemNotificationKeys.missingTimezone)
    );
  }

  const hasIncompleteIntake = user.role === 'USER' && !user.clientProfile?.intakes.length;
  if (hasIncompleteIntake && !hasNotification(incompleteIntakeDedupeKey)) {
    notifications.push(
      createUserNotification({
        userId,
        dedupeKey: systemNotificationKeys.incompleteIntake,
        kind: 'INFO',
        source: 'INTAKE',
        title: copy.intake.title,
        message: copy.intake.message,
        actionUrl: '/my/surveys',
        actionLabel: copy.intake.actionLabel
      })
    );
  } else if (!hasIncompleteIntake && isNotificationActive(incompleteIntakeDedupeKey)) {
    notifications.push(
      resolveUserNotificationByKey(userId, systemNotificationKeys.incompleteIntake)
    );
  }

  await Promise.all(notifications);
};

/** Возвращает непрочитанные и неочищенные уведомления пользователя. */
export const getUnreadUserNotifications = async (userId: string): Promise<AppNotificationDto[]> => {
  const notifications = await prisma.appNotification.findMany({
    where: { userId, readAt: null, dismissedAt: null, deletedAt: null },
    select: {
      id: true,
      kind: true,
      source: true,
      title: true,
      message: true,
      actionUrl: true,
      actionLabel: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return notifications.map(toNotificationDto);
};

/** Возвращает страницу полной истории уведомлений пользователя. */
export const getUserNotificationsHistory = async (
  userId: string,
  cursor?: string,
  pageSize = 30
): Promise<AppNotificationHistoryPage> => {
  const take = Math.min(Math.max(pageSize, 1), 100);
  const notifications = await prisma.appNotification.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      kind: true,
      source: true,
      title: true,
      message: true,
      actionUrl: true,
      actionLabel: true,
      readAt: true,
      dismissedAt: true,
      createdAt: true
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });
  const hasNextPage = notifications.length > take;
  const pageItems = hasNextPage ? notifications.slice(0, take) : notifications;

  return {
    items: pageItems.map(toNotificationHistoryDto),
    nextCursor: hasNextPage ? (pageItems.at(-1)?.id ?? null) : null
  };
};

/** Отмечает одно уведомление текущего пользователя прочитанным. */
export const markUserNotificationAsRead = async (
  userId: string,
  notificationId: string
): Promise<boolean> => {
  const result = await prisma.appNotification.updateMany({
    where: { id: notificationId, userId, readAt: null, dismissedAt: null, deletedAt: null },
    data: { readAt: new Date() }
  });
  return result.count > 0;
};

/** Отмечает все активные уведомления пользователя прочитанными. */
export const markAllUserNotificationsAsRead = async (userId: string): Promise<number> => {
  const result = await prisma.appNotification.updateMany({
    where: { userId, readAt: null, dismissedAt: null, deletedAt: null },
    data: { readAt: new Date() }
  });
  return result.count;
};

/** Скрывает все активные уведомления пользователя, сохраняя историю в БД. */
export const dismissAllUserNotifications = async (userId: string): Promise<number> => {
  const result = await prisma.appNotification.updateMany({
    where: { userId, readAt: null, dismissedAt: null, deletedAt: null },
    data: { dismissedAt: new Date() }
  });
  return result.count;
};

/** Скрывает одну запись из истории текущего администратора, сохраняя dedupe-маркер. */
export const deleteUserNotification = async (
  userId: string,
  notificationId: string
): Promise<boolean> => {
  const result = await prisma.appNotification.updateMany({
    where: { id: notificationId, userId, deletedAt: null },
    data: { deletedAt: new Date() }
  });
  return result.count > 0;
};

/** Скрывает всю историю текущего администратора, сохраняя dedupe-маркеры. */
export const deleteAllUserNotifications = async (userId: string): Promise<number> => {
  const result = await prisma.appNotification.updateMany({
    where: { userId, deletedAt: null },
    data: { deletedAt: new Date() }
  });
  return result.count;
};

/** Завершает системное уведомление после выполнения связанного действия. */
export const resolveUserNotificationByKey = async (
  userId: string,
  notificationKey: string
): Promise<void> => {
  await prisma.appNotification.updateMany({
    where: {
      userId,
      dedupeKey: `${userId}:${notificationKey}`,
      readAt: null,
      dismissedAt: null,
      deletedAt: null
    },
    data: { readAt: new Date() }
  });
};
