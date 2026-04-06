'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Event, EventMutationInput } from './use-events';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DEFAULT_SESSION_REMINDER_MINUTES,
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES,
  SESSION_REMINDER_PRESET_MINUTES
} from '@/shared/lib/session-reminders';
import { optionalMeetingUrlSchema } from '@/shared/lib/safe-url';

const eventTypeOptions = [
  'CONSULTATION',
  'FREE_SLOT',
  'DAY_OFF',
  'VACATION',
  'SICK_LEAVE',
  'OTHER'
] as const;
const eventStatusOptions = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION'] as const;

const eventSchema = z
  .object({
    title: z.string().optional(),
    type: z.enum(eventTypeOptions),
    status: z.enum(eventStatusOptions),
    start: z.string().min(1, 'Required'),
    end: z.string().min(1, 'Required'),
    meetLink: optionalMeetingUrlSchema,
    userId: z.string().optional().nullable(),
    reminderMinutesBeforeStart: z
      .number()
      .int()
      .min(MIN_SESSION_REMINDER_MINUTES)
      .max(MAX_SESSION_REMINDER_MINUTES)
  })
  .superRefine((data, ctx) => {
    if (new Date(data.start).getTime() >= new Date(data.end).getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'Время окончания должно быть позже времени начала'
      });
    }
  });

const fetcher = (url: string) => fetch(url).then(res => res.json());

type UserOption = {
  id: string;
  name: string | null;
  email: string;
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
  const { data: users, isLoading: usersLoading } = useSWR<UserOption[]>(
    '/api/admin/users',
    fetcher
  );

  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const defaultStart = selectedDate
    ? toLocalISOString(
        new Date(
          new Date(selectedDate).setHours(
            selectedDate.getHours() > 0 ? selectedDate.getHours() : 9,
            0,
            0,
            0
          )
        )
      )
    : toLocalISOString(new Date());

  const defaultEnd = selectedEndDate
    ? toLocalISOString(selectedEndDate)
    : selectedDate
      ? toLocalISOString(
          new Date(
            new Date(selectedDate).setHours(
              (selectedDate.getHours() > 0 ? selectedDate.getHours() : 9) + 1,
              0,
              0,
              0
            )
          )
        )
      : toLocalISOString(new Date(new Date().getTime() + 60 * 60 * 1000));

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || '',
      type: event?.type || 'FREE_SLOT',
      status: event?.status || 'SCHEDULED',
      start: event ? toLocalISOString(new Date(event.start)) : defaultStart,
      end: event ? toLocalISOString(new Date(event.end)) : defaultEnd,
      meetLink: event?.meetLink || '',
      userId: event?.userId || null,
      reminderMinutesBeforeStart:
        event?.reminderMinutesBeforeStart ?? DEFAULT_SESSION_REMINDER_MINUTES
    }
  });

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    setLoading(true);
    try {
      const payload: EventMutationInput = {
        ...values,
        start: new Date(values.start).toISOString(),
        end: new Date(values.end).toISOString(),
        title: values.title ?? '',
        meetLink: values.meetLink || undefined,
        userId: values.userId ?? null,
        reminderMinutesBeforeStart: values.reminderMinutesBeforeStart
      };
      await onSave(payload);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (confirm('Are you sure you want to delete this event?')) {
      setLoading(true);
      try {
        await onDelete(event.id);
        onOpenChange(false);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{event ? t('editEvent') : t('createEvent')}</DialogTitle>
          <DialogDescription>{event ? t('editEventDesc') : t('createEventDesc')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('eventType')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeOptions.map(type => (
                          <SelectItem key={type} value={type}>
                            {t(`types.${type}` as never)}
                          </SelectItem>
                        ))}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventStatusOptions.map(status => (
                          <SelectItem key={status} value={status}>
                            {t(`statuses.${status}` as never)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('eventTitle')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('startTime')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('endTime')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
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
                  <FormControl>
                    <Input
                      placeholder="https://meet.google.com/..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      {SESSION_REMINDER_PRESET_MINUTES.map(minutes => (
                        <SelectItem key={minutes} value={String(minutes)}>
                          {minutes === 0
                            ? t('sessionReminderAtStart')
                            : t('sessionReminderBeforeMinutes', { minutes })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('client')}</FormLabel>
                  <Select
                    onValueChange={val => field.onChange(val === 'none' ? null : val)}
                    value={field.value || 'none'}
                    disabled={usersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('noneSelected')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t('noneSelected')}</SelectItem>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6 flex justify-between gap-2">
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
