import useSWR from 'swr';
import { EventType, EventStatus } from '@prisma/client';
import { useTranslations } from 'next-intl';

export interface UserEvent {
  id: string;
  type: EventType;
  start: string;
  end: string;
  status: EventStatus;
  title: string | null;
  description: string | null;
  meetLink: string | null;
  userId: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
};

export function useUserEvents(startStr: string, endStr: string) {
  const t = useTranslations('My');

  const { data, error, isLoading, isValidating, mutate } = useSWR<UserEvent[]>(
    `/api/user/events?start=${startStr}&end=${endStr}`,
    fetcher,
    { refreshInterval: 30000, keepPreviousData: true }
  );

  const bookEvent = async (id: string) => {
    const res = await fetch(`/api/user/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'book' })
    });

    if (!res.ok) {
      throw new Error(t('errorBookingEvent'));
    }

    await mutate();
  };

  const cancelEvent = async (id: string, reason?: string) => {
    const res = await fetch(`/api/user/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', reason })
    });

    if (!res.ok) {
      throw new Error(t('errorCancelingEvent'));
    }

    await mutate();
  };

  const rescheduleEvent = async (oldId: string, newId: string, reason?: string) => {
    const res = await fetch(`/api/user/events/${oldId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reschedule', newEventId: newId, reason })
    });

    if (!res.ok) {
      throw new Error(t('errorReschedulingEvent') || 'Error rescheduling');
    }

    await mutate();
  };

  return {
    events: data || [],
    isLoading,
    isValidating,
    isError: error,
    bookEvent,
    cancelEvent,
    rescheduleEvent,
    mutate
  };
}
