'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useUserEvents } from './use-user-events';
import { UserCalendarView } from './user-calendar-view';
import { UserScheduleDetails } from './user-schedule-details';

export function UserScheduleDashboard() {
  const t = useTranslations('My');

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Load events for the current month +/- 1 month roughly
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // padding to fetch events before and after current month
  const fetchStart = new Date(monthStart);
  fetchStart.setDate(fetchStart.getDate() - 15);
  const fetchEnd = new Date(monthEnd);
  fetchEnd.setDate(fetchEnd.getDate() + 15);

  const { events, isLoading, bookEvent, cancelEvent } = useUserEvents(
    fetchStart.toISOString(),
    fetchEnd.toISOString()
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-[var(--header-height)]-2rem)] min-h-[600px]">
      <div className="flex-1 xl:max-w-md 2xl:max-w-lg shrink-0 flex flex-col min-h-0">
        <UserScheduleDetails
          selectedDate={selectedDate}
          events={events}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isLoading={isLoading}
          onBookEvent={bookEvent}
          onCancelEvent={cancelEvent}
        />
      </div>
      <div className="flex-[2] min-w-[500px] flex flex-col min-h-0 bg-card border rounded-xl overflow-hidden shadow-sm">
        <UserCalendarView
          currentDate={currentDate}
          selectedDate={selectedDate}
          events={events}
          onDateSelect={setSelectedDate}
          onMonthChange={setCurrentDate}
        />
      </div>
    </div>
  );
}
