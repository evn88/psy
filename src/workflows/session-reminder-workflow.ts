import type { Prisma } from '@prisma/client';
import { sleep } from 'workflow';

import { sendSessionReminderEmail } from '@/shared/lib/email';
import prisma from '@/shared/lib/prisma';
import { sendPushToMany } from '@/shared/lib/push';
import {
  getEffectiveReminderMinutes,
  getReminderTriggerAt,
  getSessionReminderPushContent
} from '@/shared/lib/session-reminders';

const REMINDER_ELIGIBLE_STATUSES = new Set<string>(['SCHEDULED', 'PENDING_CONFIRMATION']);

type SessionReminderWorkflowParams = {
  eventId: string;
  reminderWorkflowVersion: number;
};

type SessionReminderWorkflowResult = {
  status: 'sent' | 'skipped';
  reason?: string;
  emailSent: boolean;
  pushSent: boolean;
};

type ReminderEventRecord = Prisma.EventGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        name: true;
        language: true;
        timezone: true;
        pushSubscriptions: {
          select: {
            endpoint: true;
            p256dh: true;
            auth: true;
          };
        };
      };
    };
  };
}>;

type ReminderReadiness = {
  isReady: boolean;
  reason: string;
  reminderMinutes: number;
  triggerAt: Date;
};

/**
 * Формирует URL страницы управления сессиями для писем-напоминаний.
 * @returns Абсолютный URL к разделу `/my/sessions`.
 */
const getManageSessionsUrl = (): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/my/sessions`;
  }
  if (process.env.PROD_DOMAIN) {
    return `${process.env.PROD_DOMAIN}/my/sessions`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/my/sessions`;
  }
  return 'http://localhost:3000/my/sessions';
};

/**
 * Возвращает пользовательский заголовок события для уведомлений.
 * Если заголовок не задан, локализованный fallback будет вычислен в email-слое.
 * @param event - событие календаря.
 * @returns Пользовательский заголовок события либо пустую строку.
 */
const getReminderEventTitle = (event: Pick<ReminderEventRecord, 'title' | 'type'>): string => {
  return event.title?.trim() || '';
};

/**
 * Загружает событие вместе с пользователем и push-подписками.
 * @param eventId - идентификатор события.
 * @returns Событие либо `null`, если оно не найдено.
 */
const loadReminderEventByIdStep = async (eventId: string): Promise<ReminderEventRecord | null> => {
  'use step';

  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          timezone: true,
          pushSubscriptions: {
            select: {
              endpoint: true,
              p256dh: true,
              auth: true
            }
          }
        }
      }
    }
  });
};

/**
 * Проверяет, можно ли отправлять напоминание для текущего состояния события.
 * @param event - событие с пользователем.
 * @param expectedWorkflowVersion - версия workflow, с которой был запущен run.
 * @param now - текущий момент времени.
 * @returns Результат проверки с причиной и вычисленным временем триггера.
 */
const getReminderReadiness = (
  event: ReminderEventRecord | null,
  expectedWorkflowVersion: number,
  now: Date
): ReminderReadiness => {
  if (!event) {
    return {
      isReady: false,
      reason: 'event-not-found',
      reminderMinutes: 0,
      triggerAt: now
    };
  }

  if (event.reminderWorkflowVersion !== expectedWorkflowVersion) {
    return {
      isReady: false,
      reason: 'stale-workflow-version',
      reminderMinutes: 0,
      triggerAt: now
    };
  }

  if (!event.userId || !event.user) {
    return {
      isReady: false,
      reason: 'event-has-no-user',
      reminderMinutes: 0,
      triggerAt: now
    };
  }

  if (!REMINDER_ELIGIBLE_STATUSES.has(event.status)) {
    return {
      isReady: false,
      reason: 'status-is-not-eligible',
      reminderMinutes: 0,
      triggerAt: now
    };
  }

  if (event.end <= now) {
    return {
      isReady: false,
      reason: 'event-already-ended',
      reminderMinutes: 0,
      triggerAt: now
    };
  }

  if (event.reminderEmailSentAt && event.reminderPushSentAt) {
    return {
      isReady: false,
      reason: 'reminders-already-sent',
      reminderMinutes: 0,
      triggerAt: now
    };
  }

  const reminderMinutes = getEffectiveReminderMinutes(event);

  return {
    isReady: true,
    reason: 'ready',
    reminderMinutes,
    triggerAt: getReminderTriggerAt(event.start, reminderMinutes)
  };
};

/**
 * Выполняет фактическую отправку email/push-напоминаний и отмечает отправку в БД.
 * @param params - параметры запуска workflow.
 * @returns Результат отправки по каналам.
 */
const dispatchSessionReminderStep = async (
  params: SessionReminderWorkflowParams
): Promise<SessionReminderWorkflowResult> => {
  'use step';

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          timezone: true,
          pushSubscriptions: {
            select: {
              endpoint: true,
              p256dh: true,
              auth: true
            }
          }
        }
      }
    }
  });

  const now = new Date();
  const readiness = getReminderReadiness(event, params.reminderWorkflowVersion, now);
  if (!readiness.isReady || !event?.user) {
    return {
      status: 'skipped',
      reason: readiness.reason,
      emailSent: false,
      pushSent: false
    };
  }

  if (readiness.triggerAt > now) {
    return {
      status: 'skipped',
      reason: 'reminder-trigger-not-reached',
      emailSent: false,
      pushSent: false
    };
  }

  const reminderTitle = getReminderEventTitle(event);
  const nowTimestamp = new Date();
  let reminderEmailSentAt = event.reminderEmailSentAt;
  let reminderPushSentAt = event.reminderPushSentAt;
  let isEmailSent = false;
  let isPushSent = false;
  let shouldRetryDelivery = false;

  if (!event.reminderEmailSentAt && event.user.email) {
    const emailResult = await sendSessionReminderEmail({
      email: event.user.email,
      name: event.user.name || 'User',
      title: reminderTitle,
      eventType: event.type,
      start: event.start,
      end: event.end,
      meetLink: event.meetLink || undefined,
      manageUrl: getManageSessionsUrl(),
      locale: event.user.language || 'ru',
      timezone: event.user.timezone || 'UTC',
      reminderMinutes: readiness.reminderMinutes
    });
    if (emailResult) {
      isEmailSent = true;
      reminderEmailSentAt = nowTimestamp;
    } else {
      shouldRetryDelivery = true;
    }
  } else if (!event.reminderEmailSentAt) {
    reminderEmailSentAt = nowTimestamp;
  }

  if (!event.reminderPushSentAt && event.user.pushSubscriptions.length > 0) {
    const pushContent = getSessionReminderPushContent({
      locale: event.user.language,
      title: reminderTitle,
      reminderMinutes: readiness.reminderMinutes
    });
    const pushResults = await sendPushToMany(event.user.pushSubscriptions, pushContent);
    if (pushResults.some(item => item.success)) {
      isPushSent = true;
      reminderPushSentAt = nowTimestamp;
    } else {
      shouldRetryDelivery = true;
    }
  } else if (!event.reminderPushSentAt) {
    reminderPushSentAt = nowTimestamp;
  }

  if (
    reminderEmailSentAt?.getTime() !== event.reminderEmailSentAt?.getTime() ||
    reminderPushSentAt?.getTime() !== event.reminderPushSentAt?.getTime()
  ) {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        reminderEmailSentAt,
        reminderPushSentAt
      }
    });
  }

  if (shouldRetryDelivery) {
    throw new Error('Reminder delivery failed for at least one channel');
  }

  return {
    status: 'sent',
    emailSent: isEmailSent,
    pushSent: isPushSent
  };
};

/**
 * Workflow отправки напоминания о начале сессии.
 * @param params - параметры запуска workflow.
 * @returns Результат отправки либо причина пропуска.
 */
export const runSessionReminderWorkflow = async (
  params: SessionReminderWorkflowParams
): Promise<SessionReminderWorkflowResult> => {
  'use workflow';

  const currentTime = new Date();
  const event = await loadReminderEventByIdStep(params.eventId);
  const readiness = getReminderReadiness(event, params.reminderWorkflowVersion, currentTime);

  if (!readiness.isReady) {
    return {
      status: 'skipped',
      reason: readiness.reason,
      emailSent: false,
      pushSent: false
    };
  }

  if (readiness.triggerAt > currentTime) {
    await sleep(readiness.triggerAt);
  }

  return dispatchSessionReminderStep(params);
};
