import { z } from 'zod';

import { appNotificationKinds } from '@/modules/notifications/types';

/**
 * Проверяет, что действие уведомления ведёт только на внутренний маршрут приложения.
 * @param value - URL из формы или серверного модуля.
 * @returns `true` для безопасного абсолютного pathname внутри приложения.
 */
export const isSafeNotificationActionUrl = (value: string): boolean => {
  const normalizedValue = value.trim();

  if (!normalizedValue.startsWith('/') || normalizedValue.startsWith('//')) {
    return false;
  }

  try {
    const baseUrl = new URL('https://app.local');
    const parsedUrl = new URL(normalizedValue, baseUrl);
    return parsedUrl.origin === baseUrl.origin && !normalizedValue.includes('\\');
  } catch {
    return false;
  }
};

const notificationContentBaseSchema = z.object({
  kind: z.enum(appNotificationKinds).optional().default('INFO'),
  source: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  actionUrl: z
    .union([
      z.string().trim().refine(isSafeNotificationActionUrl, {
        message: 'Некорректная внутренняя ссылка'
      }),
      z.literal(''),
      z.null()
    ])
    .optional(),
  actionLabel: z.union([z.string().trim().max(40), z.null()]).optional()
});

export const notificationContentSchema = notificationContentBaseSchema.refine(
  value => !value.actionLabel || Boolean(value.actionUrl),
  {
    message: 'Для подписи действия требуется ссылка',
    path: ['actionLabel']
  }
);

export const adminNotificationBroadcastSchema = notificationContentBaseSchema
  .omit({ source: true, kind: true })
  .extend({
    to: z.array(z.email()).max(5000).default([]),
    sendToAll: z.boolean()
  })
  .refine(value => !value.actionLabel || Boolean(value.actionUrl), {
    message: 'Для подписи действия требуется ссылка',
    path: ['actionLabel']
  })
  .refine(value => value.sendToAll || value.to.length > 0, {
    message: 'Выберите хотя бы одного получателя',
    path: ['to']
  });
