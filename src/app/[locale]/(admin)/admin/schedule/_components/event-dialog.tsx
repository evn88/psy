'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, Link2, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import {
  DEFAULT_SESSION_REMINDER_MINUTES,
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES,
  SESSION_REMINDER_PRESET_MINUTES
} from '@/lib/session-reminders';
import { optionalMeetingUrlSchema } from '@/lib/safe-url';
import { createScheduleDateTime, resolveScheduleTimeZone } from '@/lib/schedule-timezone';
import { useScheduleDateTime } from '@/lib/hooks/use-schedule-date-time';
import { CONSULTATION_RATE_DURATION_MINUTES } from '@/modules/payments/financial/constants';

import {
  calculateConsultationChargePreview,
  getEventTemporalValues
} from './event-form-utils';
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

const eventSchema = z
  .object({
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
      .max(MAX_SESSION_REMINDER_MINUTES),
    billingSource: z.enum(['WALLET', 'PACKAGE']).optional(),
    purchasedPackageId: z.string().optional(),
    billingReason: z.string().trim().max(500).optional()
  })
  .superRefine((values, context) => {
    const requiresBilling =
      values.type === 'CONSULTATION' && values.status === 'SCHEDULED' && Boolean(values.userId);

    if (requiresBilling && !values.billingSource) {
      context.addIssue({
        code: 'custom',
        message: 'Выберите источник оплаты',
        path: ['billingSource']
      });
    }

    if (requiresBilling && values.billingSource === 'PACKAGE' && !values.purchasedPackageId) {
      context.addIssue({
        code: 'custom',
        message: 'Выберите пакет',
        path: ['purchasedPackageId']
      });
    }
  });

type EventFormValues = z.infer<typeof eventSchema>;

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
  timezone: string | null;
};

type FinancialSummary = {
  balance: string;
  consultationPrice: string;
  currency: 'EUR';
  packages: Array<{
    id: string;
    title: string;
    totalMinutes: number;
    remainingMinutes: number;
    expiresAt: string | null;
  }>;
};

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  selectedDate?: Date;
  selectedEndDate?: Date;
  onSave: (data: EventMutationInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  adminTimezone: string;
}

const fetchUsers = async (url: string): Promise<UserOption[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не удалось загрузить клиентов');
  }
  return response.json() as Promise<UserOption[]>;
};

const fetchFinancialSummary = async (url: string): Promise<FinancialSummary> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Не удалось загрузить баланс клиента');
  }

  return response.json() as Promise<FinancialSummary>;
};

const getInitialValues = (params: {
  event?: Event | null;
  selectedDate?: Date;
  selectedEndDate?: Date;
  adminTimezone: string;
}): EventFormValues => {
  const { event, selectedDate, selectedEndDate, adminTimezone } = params;
  const fallbackStart = selectedDate ? new Date(selectedDate) : new Date();

  if (selectedDate && selectedDate.getHours() === 0) {
    fallbackStart.setHours(9, 0, 0, 0);
  }

  const fallbackEnd = selectedEndDate || new Date(fallbackStart.getTime() + 60 * 60 * 1000);
  const temporalValues = event
    ? getEventTemporalValues(event.start, event.end, adminTimezone)
    : {
        date: format(fallbackStart, 'yyyy-MM-dd'),
        startTime: format(fallbackStart, 'HH:mm'),
        duration: Math.max(
          15,
          Math.round((fallbackEnd.getTime() - fallbackStart.getTime()) / 60_000)
        )
      };

  return {
    title: event?.title || '',
    type: event?.type || 'FREE_SLOT',
    status: event?.status || 'SCHEDULED',
    ...temporalValues,
    meetLink: event?.meetLink || '',
    userId: event?.userId || null,
    billingSource:
      event?.billingAllocation?.source === 'PACKAGE'
        ? 'PACKAGE'
        : event?.billingAllocation?.source === 'WALLET'
          ? 'WALLET'
          : 'WALLET',
    purchasedPackageId: event?.billingAllocation?.purchasedPackageId || undefined,
    billingReason: '',
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
  onDelete,
  adminTimezone
}: EventDialogProps) => {
  const t = useTranslations('Schedule');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [meetingLinksOpen, setMeetingLinksOpen] = useState(false);
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
      adminTimezone
    })
  });
  const currentDuration = form.watch('duration');
  const selectedUserId = form.watch('userId');
  const selectedEventType = form.watch('type');
  const selectedEventStatus = form.watch('status');
  const selectedBillingSource = form.watch('billingSource');
  const eventDate = form.watch('date');
  const eventStartTime = form.watch('startTime');
  const selectedUserOption = users?.find(user => user.id === selectedUserId);
  const selectedUser =
    selectedUserOption ?? (event?.user && event.user.id === selectedUserId ? event.user : null);
  const clientTimezone = resolveScheduleTimeZone(selectedUser?.timezone);
  const adminDateTime = useScheduleDateTime(adminTimezone, locale);
  const clientDateTime = useScheduleDateTime(clientTimezone, locale);
  const durationOptions = useMemo(
    () => Array.from(new Set([...defaultDurationOptions, currentDuration])).sort((a, b) => a - b),
    [currentDuration]
  );
  const shouldShowBilling =
    selectedEventType === 'CONSULTATION' &&
    selectedEventStatus === 'SCHEDULED' &&
    Boolean(selectedUserId);
  const { data: financialSummary, isLoading: financialSummaryLoading } = useSWR<FinancialSummary>(
    open && shouldShowBilling && selectedUserId
      ? `/api/admin/users/${selectedUserId}/financial-summary`
      : null,
    fetchFinancialSummary
  );
  const consultationChargePreview = financialSummary
    ? calculateConsultationChargePreview(financialSummary.consultationPrice, currentDuration)
    : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      getInitialValues({
        event,
        selectedDate,
        selectedEndDate,
        adminTimezone
      })
    );
  }, [adminTimezone, event, form, open, selectedDate, selectedEndDate]);

  let clientTimePreview: string | null = null;
  let scheduledStart: Date | null = null;
  if (selectedUserId && eventDate && eventStartTime) {
    try {
      const range = adminDateTime.fromLocalDateTime({
        date: eventDate,
        startTime: eventStartTime,
        duration: currentDuration
      });
      if (!range.success) {
        throw new Error('Указанное локальное время не существует');
      }
      scheduledStart = range.start;
      const formatter: Intl.DateTimeFormatOptions = {
        dateStyle: 'medium',
        timeStyle: 'short'
      };
      const endFormatter: Intl.DateTimeFormatOptions = {
        timeStyle: 'short'
      };
      clientTimePreview = `${clientDateTime.formatIntl(range.start, formatter)} – ${clientDateTime.formatIntl(range.end, endFormatter)}`;
    } catch {}
  }

  const onSubmit = async (values: EventFormValues) => {
    setLoading(true);
    try {
      const range = adminDateTime.fromLocalDateTime({
        date: values.date,
        startTime: values.startTime,
        duration: values.duration
      });
      if (!range.success) {
        throw new Error('Указанное локальное время не существует из-за перехода часового пояса');
      }
      const payload: EventMutationInput = {
        type: values.type,
        status: values.status,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        title: values.title?.trim() || '',
        meetLink: values.meetLink || undefined,
        userId: values.userId ?? null,
        reminderMinutesBeforeStart: values.reminderMinutesBeforeStart,
        ...(shouldShowBilling && values.billingSource
          ? {
              billingSource: values.billingSource,
              purchasedPackageId:
                values.billingSource === 'PACKAGE' ? values.purchasedPackageId : undefined,
              billingReason: values.billingReason?.trim() || undefined
            }
          : {})
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
                      <SelectTrigger className="text-left">
                        {selectedUser ? (
                          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-5">
                            <span className="truncate text-left">
                              {selectedUser.name || selectedUser.email}
                            </span>
                            <span className="flex shrink-0 items-center justify-end gap-1.5">
                              {selectedUserOption?.role === 'ADMIN' && (
                                <span
                                  className={badgeVariants({
                                    variant: 'default',
                                    className: 'size-5 justify-center px-0'
                                  })}
                                  aria-label={t('admin')}
                                  title={t('admin')}
                                >
                                  А
                                </span>
                              )}
                              <span className={badgeVariants({ variant: 'outline' })}>
                                {selectedUser.email}
                              </span>
                              <span className={badgeVariants({ variant: 'outline' })}>
                                {clientDateTime.getUtcOffset(scheduledStart || new Date())}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <SelectValue placeholder={t('noneSelected')} />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{t('noneSelected')}</SelectItem>
                        {users?.map(user => (
                          <SelectItem
                            key={user.id}
                            value={user.id}
                            className="[&>span:last-child]:w-full"
                          >
                            <span className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-2">
                              <span className="truncate">{user.name || user.email}</span>
                              <span className="flex shrink-0 items-center justify-end gap-1.5">
                                {user.role === 'ADMIN' && (
                                  <span
                                    className={badgeVariants({
                                      variant: 'default',
                                      className: 'size-5 justify-center px-0'
                                    })}
                                    aria-label={t('admin')}
                                    title={t('admin')}
                                  >
                                    А
                                  </span>
                                )}
                                <span className={badgeVariants({ variant: 'outline' })}>
                                  {user.email}
                                </span>
                                <span className={badgeVariants({ variant: 'outline' })}>
                                  {createScheduleDateTime({
                                    timeZone: user.timezone,
                                    locale
                                  }).getUtcOffset(scheduledStart || new Date())}
                                </span>
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {shouldShowBilling && (
              <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="font-medium">Оплата консультации</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {financialSummaryLoading
                      ? 'Загружаем баланс и пакеты…'
                      : `Баланс: ${financialSummary?.balance ?? '0.00'} EUR · Тариф: ${
                          financialSummary?.consultationPrice ?? '0.00'
                        } EUR`}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="billingSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Источник списания</FormLabel>
                      <Select
                        onValueChange={value => {
                          field.onChange(value);
                          if (value !== 'PACKAGE') {
                            form.setValue('purchasedPackageId', undefined);
                          }
                        }}
                        value={field.value}
                        disabled={Boolean(event?.billingAllocation)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите источник" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WALLET">Денежный баланс (EUR)</SelectItem>
                          <SelectItem value="PACKAGE" disabled={!financialSummary?.packages.length}>
                            Купленный пакет
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {event?.billingAllocation && (
                        <FormDescription>
                          Источник уже зафиксирован. Для возврата используйте отмену встречи.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedBillingSource === 'PACKAGE' && (
                  <FormField
                    control={form.control}
                    name="purchasedPackageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пакет клиента</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={Boolean(event?.billingAllocation)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите пакет" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {financialSummary?.packages.map(purchasedPackage => (
                              <SelectItem key={purchasedPackage.id} value={purchasedPackage.id}>
                                {purchasedPackage.title} · {purchasedPackage.remainingMinutes} мин.
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Для встречи будет зарезервировано {currentDuration} минут.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedBillingSource === 'WALLET' &&
                  !event?.billingAllocation &&
                  currentDuration !== CONSULTATION_RATE_DURATION_MINUTES &&
                  consultationChargePreview && (
                    <p className="text-sm text-muted-foreground">
                      За {currentDuration} минут будет списано {consultationChargePreview} EUR.
                    </p>
                  )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('date')}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
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
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
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

            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium">
                {t('adminTime')}: {adminTimezone} (
                {adminDateTime.getUtcOffset(scheduledStart || new Date())})
              </p>
              {selectedUserId && (
                <p className="mt-1 text-muted-foreground">
                  {t('clientTimePreview')}:{' '}
                  <span className="font-medium text-foreground">
                    {clientTimePreview || t('clientTimezoneMissing')}
                  </span>{' '}
                  ({clientTimezone}, {clientDateTime.getUtcOffset(scheduledStart || new Date())})
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="meetLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('meetLink')}</FormLabel>
                  <div className="flex">
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        {...field}
                        value={field.value ?? ''}
                        className="rounded-r-none"
                      />
                    </FormControl>
                    <Popover modal open={meetingLinksOpen} onOpenChange={setMeetingLinksOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="-ml-px shrink-0 rounded-l-none"
                          aria-label={t('savedMeetingLinks')}
                          aria-expanded={meetingLinksOpen}
                          disabled={savedMeetingLinks.length === 0}
                        >
                          <ChevronDown data-icon="inline-start" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        sideOffset={8}
                        collisionPadding={16}
                        className="w-[calc(100vw-3rem)] overflow-hidden p-0 sm:w-[36rem]"
                      >
                        <div className="px-4 py-3">
                          <p className="text-sm font-semibold">{t('savedMeetingLinks')}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('savedMeetingLinksDescription')}
                          </p>
                        </div>
                        <Separator />
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto p-2">
                          {savedMeetingLinks.map(link => (
                            <div
                              key={link}
                              className="flex items-stretch rounded-lg transition-colors hover:bg-accent"
                            >
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-3 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                onClick={() => {
                                  field.onChange(link);
                                  setMeetingLinksOpen(false);
                                }}
                              >
                                <Link2
                                  className="mt-0.5 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 break-all leading-5">{link}</span>
                                {field.value === link && (
                                  <Check className="mt-0.5 shrink-0 text-primary" aria-hidden />
                                )}
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="m-1 shrink-0 self-center text-muted-foreground hover:text-destructive"
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
