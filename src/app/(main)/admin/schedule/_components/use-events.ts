import useSWR from 'swr';
import { Event as PrismaEvent } from '@prisma/client';

export type Event = PrismaEvent & {
  user?: { id: string; name: string; email: string } | null;
};

const fetcher = async (url: string): Promise<Event[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch events');
  const data = await res.json();
  return data.map((e: any) => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt)
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

  const createEvent = async (eventData: any) => {
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to create event');
    await mutate();
    return res.json();
  };

  const updateEvent = async (id: string, eventData: any) => {
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
