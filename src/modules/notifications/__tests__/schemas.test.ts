import { describe, expect, it } from 'vitest';

import {
  adminNotificationBroadcastSchema,
  isSafeNotificationActionUrl,
  notificationContentSchema
} from '@/modules/notifications/schemas';

describe('notification schemas', () => {
  it('принимает безопасную внутреннюю ссылку', () => {
    expect(isSafeNotificationActionUrl('/my/surveys?tab=intakes')).toBe(true);
    expect(
      notificationContentSchema.safeParse({
        source: 'TEST',
        title: 'Заголовок',
        message: 'Сообщение',
        actionUrl: '/my/surveys',
        actionLabel: 'Открыть'
      }).success
    ).toBe(true);
  });

  it('отклоняет внешние и protocol-relative ссылки', () => {
    expect(isSafeNotificationActionUrl('https://example.com/my')).toBe(false);
    expect(isSafeNotificationActionUrl('//example.com/my')).toBe(false);
    expect(isSafeNotificationActionUrl('/my\\surveys')).toBe(false);
  });

  it('требует получателя для выборочной рассылки', () => {
    const result = adminNotificationBroadcastSchema.safeParse({
      to: [],
      sendToAll: false,
      title: 'Обновление',
      message: 'Новое сообщение',
      actionUrl: null,
      actionLabel: null
    });

    expect(result.success).toBe(false);
  });
});
