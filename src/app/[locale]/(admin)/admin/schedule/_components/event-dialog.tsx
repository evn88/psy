'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Clock3, Trash2, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DEFAULT_SESSION_REMINDER_MINUTES,
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES,
  SESSION_REMINDER_PRESET_MINUTES
} from '@/lib/session-reminders';
import { optionalMeetingUrlSchema } from '@/lib/safe-url';
import { isValidTimeZone } from '@/lib/timezone';
import { detectBrowserTimeZone } from '@/lib/browser-timezone';

import { getEventDateRange, getEventTemporalValues } from './event-form-utils';
import type { Event, EventMutationInput } from './use-events';
import { useSavedMeetingLinks } from './use-saved-meeting-links';

const eventTypeOptions = [
  'CONSULTATION',
  'FREE_SLOT',
  'DAY_OFF',
  'VACATION',
  'SICK_LEAVE',
  'OTHER'
] as const;
const eventStatusOptions = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION'] as const;
const defaultDurationOptions = [30, 45, 60, 90, 120];

const eventSchema = z.object({
  title: z.string().optional(),
  type: z.enum(eventTypeOptions),
  status: z.enum(eventStatusOptions),
  date: z.string().min(1, 'Обязательно'),
  startTime: z.string().min(1, 'Обязательно'),
  duration: z
    .number()
    .int()
    .min(15, 'Минимум 15 минут')
    .max(8 * 60, 'Максимум 8 часов'),
  meetLink: optionalMeetingUrlSchema,
  userId: z.string().optional().nullable(),
  reminderMinutesBeforeStart: z
    .number()
    .int()
    .min(MIN_SESSION_REMINDER_MINUTES)
    .max(MAX_SESSION_REMINDER_MINUTES)
});

type EventFormValues = z.infer<typeof eventSchema>;

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
  timezone: string | null;
};

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  selectedDate?: Date;
  selectedEndDate?: Date;
  onSave: (data: EventMutationInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const fetchUsers = async (url: string): Promise<UserOption[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не удалось загрузить клиентов');
  }
  return response.json() as Promise<UserOption[]>;
};

const getBrowserTimezone = (): string => {
  return detectBrowserTimeZone() || 'UTC';
};

const getInitialValues = (params: {
  event?: Event | null;
  selectedDate?: Date;
  selectedEndDate?: Date;
  fallbackTimezone: string;
}): EventFormValues => {
  const { event, selectedDate, selectedEndDate, fallbackTimezone } = params;
  const clientTimezone = event?.user
    ? event.user.timezone && isValidTimeZone(event.user.timezone)
      ? event.user.timezone
      : 'UTC'
    : fallbackTimezone;
  const fallbackStart = selectedDate ? new Date(selectedDate) : new Date();

  if (selectedDate && selectedDate.getHours() === 0) {
    fallbackStart.setHours(9, 0, 0, 0);
  }

  const fallbackEnd = selectedEndDate || new Date(fallbackStart.getTime() + 60 * 60 * 1000);
  const temporalValues = getEventTemporalValues(
    event?.start || fallbackStart,
    event?.end || fallbackEnd,
    clientTimezone
  );

  return {
    title: event?.title || '',
    type: event?.type || 'FREE_SLOT',
    status: event?.status || 'SCHEDULED',
    ...temporalValues,
    meetLink: event?.meetLink || '',
    userId: event?.userId || null,
    reminderMinutesBeforeStart:
      event?.reminderMinutesBeforeStart ?? DEFAULT_SESSION_REMINDER_MINUTES
  };
};

export const EventDialog = ({
  open,
  onOpenChange,
  event,
  selectedDate,
  selectedEndDate,
  onSave,
  onDelete
}: EventDialogProps) => {
  const t = useTranslations('Schedule');
  const [loading, setLoading] = useState(false);
  const [meetingLinksOpen, setMeetingLinksOpen] = useState(false);
  const [browserTimezone] = useState(getBrowserTimezone);
  const { links: savedMeetingLinks, saveLink, removeLink } = useSavedMeetingLinks();
  const { data: users, isLoading: usersLoading } = useSWR<UserOption[]>(
    open ? '/api/admin/users?roles=USER,ADMIN' : null,
    fetchUsers
  );
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: getInitialValues({
      event,
      selectedDate,
      selectedEndDate,
      fallbackTimezone: browserTimezone
    })
  });
  const currentDuration = form.watch('duration');
  const selectedUserId = form.watch('userId');
  const selectedUser =
    users?.find(user => user.id === selectedUserId) ??
    (event?.user && event.user.id === selectedUserId ? event.user : null);
  const selectedUserHasTimezone = Boolean(
    selectedUser?.timezone && isValidTimeZone(selectedUser.timezone)
  );
  const clientTimezone = selectedUserId
    ? selectedUserHasTimezone
      ? selectedUser?.timezone || 'UTC'
      : 'UTC'
    : browserTimezone;
  const durationOptions = useMemo(
    () => Array.from(new Set([...defaultDurationOptions, currentDuration])).sort((a, b) => a - b),
    [currentDuration]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      getInitialValues({
        event,
        selectedDate,
        selectedEndDate,
        fallbackTimezone: browserTimezone
      })
    );
  }, [browserTimezone, event, form, open, selectedDate, selectedEndDate]);

  const onSubmit = async (values: EventFormValues) => {
    setLoading(true);
    try {
      const { start, end } = getEventDateRange({
        date: values.date,
        startTime: values.startTime,
        duration: values.duration,
        timeZone: clientTimezone
      });
      const payload: EventMutationInput = {
        type: values.type,
        status: values.status,
        start: start.toISOString(),
        end: end.toISOString(),
        title: values.title?.trim() || '',
        meetLink: values.meetLink || undefined,
        userId: values.userId ?? null,
        reminderMinutesBeforeStart: values.reminderMinutesBeforeStart
      };

      await onSave(payload);
      saveLink(values.meetLink);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete || !window.confirm(t('deleteConfirmation'))) {
      return;
    }

    setLoading(true);
    try {
      await onDelete(event.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{event ? t('editEvent') : t('createEvent')}</DialogTitle>
          <DialogDescription>{event ? t('editEventDesc') : t('createEventDesc')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('client')}</FormLabel>
                  <Select
                    onValueChange={value => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                    disabled={usersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('noneSelected')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{t('noneSelected')}</SelectItem>
                        {users?.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email} (
                            {user.role === 'ADMIN' ? t('admin') : user.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                {selectedUserId && !selectedUserHasTimezone ? (
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                ) : (
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t('clientTimezone')}</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {selectedUserId && !selectedUserHasTimezone
                      ? t('clientTimezoneMissing')
                      : clientTimezone}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {selectedUserId
                      ? t('clientTimezoneReadOnlyDescription')
                      : t('browserTimezoneDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('startTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('duration')}</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(Number(value))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('duration')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {durationOptions.map(minutes => (
                            <SelectItem key={minutes} value={String(minutes)}>
                              {t('durationMinutes', { minutes })}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="meetLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('meetLink')}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <Popover open={meetingLinksOpen} onOpenChange={setMeetingLinksOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={t('savedMeetingLinks')}
                          disabled={savedMeetingLinks.length === 0}
                        >
                          <ChevronDown data-icon="inline-start" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[min(420px,calc(100vw-2rem))] p-2">
                        <p className="px-2 py-1 text-sm font-medium">{t('savedMeetingLinks')}</p>
                        <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                          {savedMeetingLinks.map(link => (
                            <div
                              key={link}
                              className="flex items-center gap-1 rounded-md hover:bg-accent"
                            >
                              <button
                                type="button"
                                className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm"
                                onClick={() => {
                                  field.onChange(link);
                                  setMeetingLinksOpen(false);
                                }}
                              >
                                {link}
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t('deleteSavedMeetingLink', { link })}
                                onClick={() => removeLink(link)}
                              >
                                <Trash2 data-icon="inline-start" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormDescription>{t('meetingLinkHistoryDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('eventType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('eventType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {eventTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>
                              {t(`types.${type}` as never)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('status')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {eventStatusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {t(`statuses.${status}` as never)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reminderMinutesBeforeStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sessionReminderLabel')}</FormLabel>
                  <Select
                    onValueChange={value => field.onChange(Number(value))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('sessionReminderLabel')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {SESSION_REMINDER_PRESET_MINUTES.map(minutes => (
                          <SelectItem key={minutes} value={String(minutes)}>
                            {minutes === 0
                              ? t('sessionReminderAtStart')
                              : t('sessionReminderBeforeMinutes', { minutes })}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('eventTitlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row justify-between gap-2">
              <div>
                {event && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    {t('delete')}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t('saving') : t('save')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
