import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn()
}));

vi.mock('web-push', () => ({
  default: {
    sendNotification: mocks.sendNotification,
    setVapidDetails: mocks.setVapidDetails
  }
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    pushSubscription: {
      deleteMany: mocks.deleteMany
    }
  }
}));

import { sendPushToSubscription } from '../push';

const subscription = {
  endpoint: 'https://push.example.test/subscription',
  p256dh: 'p256dh',
  auth: 'auth'
};

describe('Web Push delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = 'mailto:test@example.test';
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
    process.env.VAPID_PRIVATE_KEY = 'private-key';
  });

  it('передаёт стабильный tag и отключает повторное оповещение', async () => {
    // Arrange
    mocks.sendNotification.mockResolvedValueOnce(undefined);

    // Act
    const result = await sendPushToSubscription(subscription, {
      body: 'Примите лекарство',
      tag: 'pillo-intake-intake-1',
      renotify: false
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      JSON.stringify({
        title: '',
        body: 'Примите лекарство',
        url: undefined,
        tag: 'pillo-intake-intake-1',
        renotify: false
      })
    );
  });

  it('не превращает ошибку очистки истёкшей подписки в неизвестный результат доставки', async () => {
    // Arrange
    mocks.sendNotification.mockRejectedValueOnce(
      Object.assign(new Error('subscription expired'), { statusCode: 410 })
    );
    mocks.deleteMany.mockRejectedValueOnce(new Error('database unavailable'));

    // Act
    const result = await sendPushToSubscription(subscription, {
      body: 'Примите лекарство'
    });

    // Assert
    expect(result).toEqual({
      endpoint: subscription.endpoint,
      success: false,
      error: 'subscription expired'
    });
  });
});
