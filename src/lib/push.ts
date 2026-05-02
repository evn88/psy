import webpush from 'web-push';
import prisma from '@/lib/prisma';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error('VAPID environment variables are not set');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type PushPayload = {
  title?: string;
  body: string;
  url?: string;
};

export type PushResult = {
  endpoint: string;
  success: boolean;
  error?: string;
};

/**
 * Отправить push-уведомление на один endpoint.
 * При ответе 410 Gone — endpoint устарел, удаляем из БД.
 */
export async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<PushResult> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      },
      JSON.stringify({
        title: payload.title ?? '',
        body: payload.body,
        url: payload.url
      })
    );
    return { endpoint: sub.endpoint, success: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;

    // 410 Gone — подписка более недействительна, удаляем
    if (statusCode === 410) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: sub.endpoint }
      });
    }

    return {
      endpoint: sub.endpoint,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Отправить push-уведомления списку подписок параллельно.
 */
export async function sendPushToMany(
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
): Promise<PushResult[]> {
  return Promise.all(subscriptions.map(sub => sendPushToSubscription(sub, payload)));
}
