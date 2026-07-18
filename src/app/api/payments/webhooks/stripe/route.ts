import { NextResponse } from 'next/server';

import { constructStripeWebhookEvent } from '@/modules/payments/stripe/client.server';
import { processStripeWebhookEvent } from '@/modules/payments/stripe/service.server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

export const runtime = 'nodejs';

/**
 * Принимает Stripe webhook и проверяет подпись по исходному, не преобразованному body.
 */
const postHandler = async (request: Request) => {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ message: 'Missing Stripe signature' }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = constructStripeWebhookEvent(payload, signature);
    await processStripeWebhookEvent(event);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Failed to process Stripe webhook:', error);
    return NextResponse.json({ message: 'Invalid Stripe webhook' }, { status: 400 });
  }
};

export const POST = withApiLogging(postHandler, { resolveUser: false });
