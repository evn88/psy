import useSWR from 'swr';
import { Event as PrismaEvent, EventStatus, EventType } from '@prisma/client';

export type Event = PrismaEvent & {
  user?: { id: string; name: string; email: string } | null;
};

export type EventMutationInput = {
  type: EventType;
  start: string;
  end: string;
  status: EventStatus;
  title: string;
  meetLink?: string;
  userId: string | null;
};

type EventApiItem = Omit<Event, 'start' | 'end' | 'createdAt' | 'updatedAt'> & {
  start: string;
  end: string;
  createdAt: string;
  updatedAt: string;
};

const fetcher = async (url: string): Promise<Event[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch events');
  const data = (await res.json()) as EventApiItem[];
  return data.map(event => ({
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt)
  }));
};

export const useEvents = (start?: Date, end?: Date) => {
  const startIso = start?.toISOString();
  const endIso = end?.toISOString();
  const key = startIso && endIso ? `/api/admin/events?start=${startIso}&end=${endIso}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Event[]>(key, fetcher, {
    keepPreviousData: true,
    refreshInterval: 30000
  });

  const createEvent = async (eventData: EventMutationInput) => {
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to create event');
    await mutate();
    return res.json();
  };

  const updateEvent = async (id: string, eventData: EventMutationInput) => {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to update event');
    await mutate();
    return res.json();
  };

  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
    await mutate();
  };

  return {
    events: data || [],
    isLoading,
    isValidating,
    error: error?.message || null,
    refetch: mutate,
    createEvent,
    updateEvent,
    deleteEvent
  };
};
