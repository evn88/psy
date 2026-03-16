import { useState, useEffect, useCallback } from 'react';
import { EventType, EventStatus, Event as PrismaEvent } from '@prisma/client';

export type Event = PrismaEvent & {
  user?: { id: string; name: string; email: string } | null;
};

export const useEvents = (start?: Date, end?: Date) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startIso = start?.toISOString();
  const endIso = end?.toISOString();

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL('/api/admin/events', window.location.origin);
      if (startIso) url.searchParams.append('start', startIso);
      if (endIso) url.searchParams.append('end', endIso);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch events');

      const data = await res.json();
      // Date instances need to be recreated from ISO strings
      const parsedData = data.map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt)
      }));
      setEvents(parsedData);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [startIso, endIso]);

  useEffect(() => {
    fetchEvents();
    // Simple polling every 30 seconds
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const createEvent = async (data: any) => {
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create event');
    await fetchEvents();
    return res.json();
  };

  const updateEvent = async (id: string, data: any) => {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update event');
    await fetchEvents();
    return res.json();
  };

  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete event');
    await fetchEvents();
  };

  return { events, isLoading, error, refetch: fetchEvents, createEvent, updateEvent, deleteEvent };
};
