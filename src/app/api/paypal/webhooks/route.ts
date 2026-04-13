import { NextResponse } from 'next/server';
import { verifyPayPalWebhookSignature } from '@/shared/lib/paypal/client';
import { processPayPalWebhookEvent } from '@/shared/lib/paypal/service';
import type { PayPalWebhookEvent } from '@/shared/lib/paypal/types';

/**
 * POST /api/paypal/webhooks
 * Принимает PayPal webhook, проверяет подпись и синхронизирует локальные сущности.
 */
export async function POST(request: Request) {
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
