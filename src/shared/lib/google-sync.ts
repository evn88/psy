import prisma from '@/shared/lib/prisma';

export async function syncEventWithGoogle(eventId: string, action: 'CREATE' | 'UPDATE' | 'DELETE') {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        author: true,
        user: true
      }
    });

    if (!event || !event.author) return;

    if (event.author.googleCalendarSyncEnabled && event.author.googleCalendarSyncUrl) {
      // Fire and forget webhook call
      fetch(event.author.googleCalendarSyncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          event: {
            id: event.id,
            title: event.title,
            type: event.type,
            status: event.status,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
            meetLink: event.meetLink || '',
            clientName: event.user?.name || '',
            clientEmail: event.user?.email || ''
          }
        })
      }).catch(err => console.error('Error sending Google Sync webhook:', err));
    }
  } catch (error) {
    console.error('Failed to sync event with Google:', error);
  }
}
