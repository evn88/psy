import { NextResponse } from 'next/server';
import { verifyPayPalWebhookSignature } from '@/modules/payments/paypal/client';
import { processPayPalWebhookEvent } from '@/modules/payments/paypal/service';
import type { PayPalWebhookEvent } from '@/modules/payments/paypal/types';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/**
 * POST /api/paypal/webhooks
 * Принимает PayPal webhook, проверяет подпись и синхронизирует локальные сущности.
 */
async function postHandler(request: Request) {
  try {
    const event = (await request.json()) as PayPalWebhookEvent;
    const isVerified = await verifyPayPalWebhookSignature({
      headers: request.headers,
      event
    });

    if (!isVerified) {
      return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 400 });
    }

    await processPayPalWebhookEvent(event);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Failed to process PayPal webhook:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
