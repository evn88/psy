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
  reminderMinutesBeforeStart: number;
};

type EventApiItem = Omit<Event, 'start' | 'end' | 'createdAt' | 'updatedAt'> & {
  start: string;
  end: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Преобразует строковые даты API в объекты `Date`.
 * @param event - событие в формате API.
 * @returns Нормализованное событие для клиентского UI.
 */
const parseEvent = (event: EventApiItem): Event => {
  return {
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt)
  };
};

/**
 * Выполняет запрос и пробрасывает человекочитаемую ошибку API.
 * @param input - URL или объект запроса.
 * @param init - дополнительные опции fetch.
 * @returns Объект `Response`, если запрос успешен.
 */
const fetchJsonOrThrow = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(input, init);

  if (response.ok) {
    return response;
  }

  let errorMessage = 'Request failed';

  try {
    const payload = (await response.json()) as { message?: string };
    errorMessage = payload.message || errorMessage;
  } catch {}

  throw new Error(errorMessage);
};

/**
 * Загружает список событий с API и нормализует даты.
 * @param url - адрес route handler.
 * @returns Список событий для клиентского календаря.
 */
const fetcher = async (url: string): Promise<Event[]> => {
  const res = await fetchJsonOrThrow(url);
  const data = (await res.json()) as EventApiItem[];
  return data.map(parseEvent);
};

/**
 * Управляет загрузкой, мутациями и approval-действиями над событиями календаря.
 * @param start - начало активного диапазона календаря.
 * @param end - конец активного диапазона календаря.
 * @returns Данные календаря, pending-запросы и методы мутаций.
 */
export const useEvents = (start?: Date, end?: Date) => {
  const startIso = start?.toISOString();
  const endIso = end?.toISOString();
  const key = startIso && endIso ? `/api/admin/events?start=${startIso}&end=${endIso}` : null;
  const pendingKey = '/api/admin/events/pending';

  const { data, error, isLoading, isValidating, mutate } = useSWR<Event[]>(key, fetcher, {
    keepPreviousData: true,
    refreshInterval: 30000
  });
  const {
    data: pendingRequestsData,
    error: pendingRequestsError,
    isLoading: isPendingRequestsLoading,
    isValidating: isPendingRequestsValidating,
    mutate: mutatePendingRequests
  } = useSWR<Event[]>(pendingKey, fetcher, {
    refreshInterval: 30000
  });

  /**
   * Переобновляет календарь и список pending-запросов после мутации.
   * @returns Promise, который завершается после завершения revalidate.
   */
  const revalidateEventsData = async (): Promise<void> => {
    await Promise.all([mutate(), mutatePendingRequests()]);
  };

  const createEvent = async (eventData: EventMutationInput) => {
    const res = await fetchJsonOrThrow('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    await revalidateEventsData();
    return res.json();
  };

  const updateEvent = async (id: string, eventData: EventMutationInput) => {
    const res = await fetchJsonOrThrow(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    await revalidateEventsData();
    return res.json();
  };

  const deleteEvent = async (id: string) => {
    await fetchJsonOrThrow(`/api/admin/events/${id}`, { method: 'DELETE' });
    await revalidateEventsData();
  };

  /**
   * Подтверждает запрос на бронирование и переводит событие в статус `SCHEDULED`.
   * @param id - идентификатор события.
   */
  const approvePendingEvent = async (id: string): Promise<void> => {
    await fetchJsonOrThrow(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: EventStatus.SCHEDULED
      })
    });
    await revalidateEventsData();
  };

  /**
   * Отклоняет запрос на бронирование и возвращает слот в доступное состояние.
   * @param id - идентификатор события.
   * @param cancelReason - необязательная причина отказа для пользователя.
   */
  const rejectPendingEvent = async (id: string, cancelReason?: string): Promise<void> => {
    await fetchJsonOrThrow(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: EventStatus.CANCELLED,
        cancelReason: cancelReason?.trim() || null
      })
    });
    await revalidateEventsData();
  };

  return {
    events: data || [],
    pendingRequests: pendingRequestsData || [],
    isLoading,
    isValidating,
    isPendingRequestsLoading,
    isPendingRequestsValidating,
    error: error?.message || pendingRequestsError?.message || null,
    refetch: mutate,
    createEvent,
    updateEvent,
    deleteEvent,
    approvePendingEvent,
    rejectPendingEvent
  };
};
