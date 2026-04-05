import { Resend } from 'resend';
import { AdminMessageTemplate } from '@/components/email-templates/admin-message-template';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend allows up to 100 emails per batch request
const MAX_BATCH_SIZE = 100;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

type ResendBatchResponseItem = {
  id?: string;
  error?: {
    message?: string;
  };
};

type ResendBatchResponse = ResendBatchResponseItem[] | { data?: ResendBatchResponseItem[] };

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, message, sendToAll } = body;

    if (!subject || !message || (!sendToAll && !to)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let emails: string[] = [];

    if (sendToAll) {
      // 1. Fetch all users
      const users = await prisma.user.findMany({
        select: { email: true }
      });

      emails = users.map((u: { email: string | null }) => u.email).filter(Boolean) as string[];
    } else {
      emails = Array.isArray(to) ? to : [to];
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No user email addresses provided.' }, { status: 400 });
    }

    // 2. Prepare batches
    const emailBatches = chunkArray(emails, MAX_BATCH_SIZE);

    interface DeliveryStatus {
      id?: string;
      email: string;
      success: boolean;
      status: 'queued' | 'delivered' | 'bounced' | 'complained' | 'rejected' | 'error' | 'sent';
      error?: string;
    }

    const deliveryStatuses: DeliveryStatus[] = [];

    // 3. Send batches
    for (const batch of emailBatches) {
      const payload = batch.map(email => ({
        from: 'Admin <noreply@vershkov.com>',
        to: [email],
        subject: subject,
        react: AdminMessageTemplate({ subject, message })
      }));

      const { data, error } = await resend.batch.send(payload);

      // If the whole batch payload fails (e.g. invalid API key)
      if (error) {
        console.error('Batch send critical error:', error);
        batch.forEach(email => {
          deliveryStatuses.push({
            email,
            success: false,
            status: 'error',
            error: typeof error === 'string' ? error : error.message || 'Общая ошибка API'
          });
        });
        continue;
      }

      // If batch is accepted, iterate through individual results
      if (data) {
        // Resend batch sometimes returns data.data as the array
        const responses: ResendBatchResponse | undefined = Array.isArray(data)
          ? data
          : data && typeof data === 'object'
            ? ((data as { data?: ResendBatchResponseItem[] }).data ?? undefined)
            : undefined;

        if (Array.isArray(responses)) {
          batch.forEach((email, index) => {
            const res = responses[index];
            if (res && res.error) {
              deliveryStatuses.push({
                email,
                success: false,
                status: 'error',
                error: res.error.message || 'Ошибка доставки'
              });
            } else if (res && res.id) {
              // Successfully queued up in Resend
              deliveryStatuses.push({ id: res.id, email, success: true, status: 'queued' });
            } else {
              deliveryStatuses.push({
                email,
                success: false,
                status: 'error',
                error: 'Нет ответа от сервера'
              });
            }
          });
        } else {
          // Fallback if data format changes (rare but prevents breaking)
          batch.forEach(email => deliveryStatuses.push({ email, success: true, status: 'queued' }));
        }
      }
    }

    return NextResponse.json({ success: true, statuses: deliveryStatuses });
  } catch (error) {
    console.error('Email send exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
