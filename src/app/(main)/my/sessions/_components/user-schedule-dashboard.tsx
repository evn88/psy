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
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-10rem)] md:min-h-[500px]">
      {/* Calendar — first on mobile, second on desktop */}
      <div className="order-1 md:order-2 flex-1 flex flex-col min-h-0 bg-card border rounded-xl overflow-hidden shadow-sm min-h-[350px] md:min-h-0">
        <UserCalendarView
          currentDate={currentDate}
          selectedDate={selectedDate}
          events={events}
          onDateSelect={setSelectedDate}
          onMonthChange={setCurrentDate}
        />
      </div>
      {/* Details — second on mobile, first on desktop */}
      <div className="order-2 md:order-1 md:w-80 lg:w-96 md:shrink-0 flex flex-col min-h-0">
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
    </div>
  );
}
