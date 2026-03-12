import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid IDs' }, { status: 400 });
    }

    const statuses: Record<string, string> = {};

    // By default, list() returns up to 100 most recent emails.
    // If we just sent a batch, they should be in this first page.
    const { data: listResponse, error } = await resend.emails.list();

    if (error || !listResponse || !listResponse.data) {
      console.error('Failed to list emails:', error);
      // Fallback: mark everything as error/queued if we can't fetch the list
      ids.forEach((id: string) => {
        statuses[id] = 'queued'; // Keep trying instead of failing hard immediately
      });
      return NextResponse.json({ success: true, statuses });
    }

    const recentEmails = listResponse.data;

    // Map the fetched statuses back to the requested IDs
    for (const id of ids) {
      const emailRecord = recentEmails.find(e => e.id === id);
      if (emailRecord) {
        statuses[id] = emailRecord.last_event || 'queued';
      } else {
        // If we don't find it in the recent list, it might be older or just taking time to appear
        statuses[id] = 'queued';
      }
    }

    return NextResponse.json({ success: true, statuses });
  } catch (error) {
    console.error('Email status exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
