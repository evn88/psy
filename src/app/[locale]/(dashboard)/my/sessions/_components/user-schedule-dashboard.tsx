'use client';

import { useState } from 'react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useUserEvents } from './use-user-events';
import { UserCalendarView } from './user-calendar-view';
import { UserScheduleDetails } from './user-schedule-details';
import { fromScheduleCalendarDate, toScheduleCalendarDate } from '@/lib/schedule-timezone';

export function UserScheduleDashboard({ userTimezone }: { userTimezone: string }) {
  const [currentDate, setCurrentDate] = useState<Date>(() =>
    toScheduleCalendarDate(new Date(), userTimezone)
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    toScheduleCalendarDate(new Date(), userTimezone)
  );
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Load events for the current month +/- 1 month roughly
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // padding to fetch events before and after current month
  const fetchStart = new Date(monthStart);
  fetchStart.setDate(fetchStart.getDate() - 15);
  const fetchEnd = new Date(monthEnd);
  fetchEnd.setDate(fetchEnd.getDate() + 15);

  const { events, isLoading, isValidating, bookEvent, cancelEvent, rescheduleEvent } =
    useUserEvents(
      fromScheduleCalendarDate(fetchStart, userTimezone).toISOString(),
      fromScheduleCalendarDate(fetchEnd, userTimezone).toISOString()
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
          isFetching={isValidating}
          userTimezone={userTimezone}
        />
      </div>
      {/* Details — second on mobile, first on desktop */}
      <div className="order-2 md:order-1 md:w-80 lg:w-96 xl:w-[400px] 2xl:w-[480px] md:shrink-0 flex flex-col min-h-0">
        <UserScheduleDetails
          selectedDate={selectedDate}
          events={events}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isLoading={isLoading}
          onBookEvent={bookEvent}
          onCancelEvent={cancelEvent}
          onRescheduleEvent={rescheduleEvent}
          userTimezone={userTimezone}
        />
      </div>
    </div>
  );
}
