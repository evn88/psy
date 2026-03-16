'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventType, EventStatus } from '@prisma/client';
import { Event } from './use-events';
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
import { Textarea } from '@/components/ui/textarea';

const eventSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['CONSULTATION', 'FREE_SLOT', 'DAY_OFF', 'VACATION', 'SICK_LEAVE', 'OTHER']),
  status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION']),
  start: z.string().min(1, 'Required'),
  end: z.string().min(1, 'Required'),
  meetLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  userId: z.string().optional().nullable()
});

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  selectedDate?: Date;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const EventDialog = ({
  open,
  onOpenChange,
  event,
  selectedDate,
  onSave,
  onDelete
}: EventDialogProps) => {
  const t = useTranslations('Schedule');
  const [loading, setLoading] = useState(false);
  const { data: users, isLoading: usersLoading } = useSWR('/api/admin/users', fetcher);

  const defaultStart = selectedDate
    ? new Date(selectedDate.setHours(9, 0, 0, 0)).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const defaultEnd = selectedDate
    ? new Date(selectedDate.setHours(10, 0, 0, 0)).toISOString().slice(0, 16)
    : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || '',
      type: event?.type || 'FREE_SLOT',
      status: event?.status || 'SCHEDULED',
      start: event ? new Date(event.start).toISOString().slice(0, 16) : defaultStart,
      end: event ? new Date(event.end).toISOString().slice(0, 16) : defaultEnd,
      meetLink: event?.meetLink || '',
      userId: event?.userId || null
    }
  });

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    setLoading(true);
    try {
      // Must convert local ISO string to proper UTC ISO string for backend
      const payload = {
        ...values,
        start: new Date(values.start).toISOString(),
        end: new Date(values.end).toISOString()
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
                        {[
                          'CONSULTATION',
                          'FREE_SLOT',
                          'DAY_OFF',
                          'VACATION',
                          'SICK_LEAVE',
                          'OTHER'
                        ].map(type => (
                          <SelectItem key={type} value={type}>
                            {t(`types.${type}` as any)}
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
                        {['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION'].map(
                          status => (
                            <SelectItem key={status} value={status}>
                              {t(`statuses.${status}` as any)}
                            </SelectItem>
                          )
                        )}
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
                    <Input placeholder="https://meet.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Клиент</FormLabel>
                  <Select
                    onValueChange={val => field.onChange(val === 'none' ? null : val)}
                    value={field.value || 'none'}
                    disabled={usersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Никто не выбран" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Никто не выбран</SelectItem>
                      {users?.map((u: any) => (
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
