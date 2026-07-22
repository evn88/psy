'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ru } from 'date-fns/locale';
import { CheckCircle2, Edit, Plus, Trash2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { TimePicker } from '@/components/ui/time-picker';
import { useRouter } from '@/i18n/navigation';

interface ClientEvent {
  id: string;
  title: string | null;
  start: Date | string;
  end: Date | string;
  type: string;
  status: string;
  billingAllocation: {
    purchasedPackageId: string | null;
    source: 'PACKAGE' | 'WALLET' | 'FREE';
  } | null;
}

interface FinancialSummary {
  balance: string;
  consultationPrice: string;
  packages: Array<{
    id: string;
    title: string;
    totalMinutes: number;
    remainingMinutes: number;
  }>;
}

const eventTypeOptions = ['CONSULTATION', 'OTHER'] as const;
const eventStatusOptions = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION'] as const;

const eventSchema = z
  .object({
    title: z.string().optional(),
    type: z.enum(eventTypeOptions),
    status: z.enum(eventStatusOptions),
    date: z.string().min(1, 'Обязательно'),
    startTime: z.string().min(1, 'Обязательно'),
    duration: z.number().int().min(15, 'Минимум 15 минут'),
    billingSource: z.enum(['WALLET', 'PACKAGE']).optional(),
    purchasedPackageId: z.string().optional()
  })
  .superRefine((values, context) => {
    const requiresBilling = values.type === 'CONSULTATION' && values.status === 'SCHEDULED';

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

const fetchFinancialSummary = async (url: string): Promise<FinancialSummary> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не удалось загрузить баланс и пакеты клиента');
  }
  return response.json() as Promise<FinancialSummary>;
};

/**
 * Выполняет мутацию встречи через единый финансово-безопасный API расписания.
 */
const mutateEvent = async (
  url: string,
  method: 'DELETE' | 'PATCH' | 'POST',
  body?: Record<string, unknown>
): Promise<void> => {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = (await response.json()) as { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || 'Не удалось сохранить запись');
  }
};

interface ClientScheduleProps {
  userId: string;
  events: ClientEvent[];
  adminTimezone: string;
  clientTimezone: string;
}

export const ClientSchedule = ({
  userId,
  events,
  adminTimezone,
  clientTimezone
}: ClientScheduleProps) => {
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<ClientEvent | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      date: '',
      startTime: '',
      duration: 60,
      billingSource: 'WALLET',
      purchasedPackageId: undefined
    }
  });
  const [
    selectedType,
    selectedStatus,
    selectedBillingSource,
    selectedDuration,
    selectedDate,
    selectedStartTime
  ] = useWatch({
    control: form.control,
    name: ['type', 'status', 'billingSource', 'duration', 'date', 'startTime']
  });
  const shouldShowBilling = selectedType === 'CONSULTATION' && selectedStatus === 'SCHEDULED';
  const { data: financialSummary, isLoading: financialSummaryLoading } = useSWR<FinancialSummary>(
    dialogOpen && shouldShowBilling ? `/api/admin/users/${userId}/financial-summary` : null,
    fetchFinancialSummary
  );

  const openAddDialog = () => {
    form.reset({
      title: '',
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      date: formatInTimeZone(new Date(), adminTimezone, 'yyyy-MM-dd'),
      startTime: formatInTimeZone(new Date(), adminTimezone, 'HH:mm'),
      duration: 60,
      billingSource: 'WALLET',
      purchasedPackageId: undefined
    });
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: ClientEvent, statusOverride?: EventFormValues['status']) => {
    const d = new Date(event.start);
    const e = new Date(event.end);
    const diffMins = Math.round((e.getTime() - d.getTime()) / 60000);

    form.reset({
      title: event.title || '',
      type: (['CONSULTATION', 'OTHER'].includes(event.type) ? event.type : 'OTHER') as
        | 'CONSULTATION'
        | 'OTHER',
      status: statusOverride ?? (event.status as EventFormValues['status']),
      date: formatInTimeZone(d, adminTimezone, 'yyyy-MM-dd'),
      startTime: formatInTimeZone(d, adminTimezone, 'HH:mm'),
      duration: diffMins > 0 ? diffMins : 60,
      billingSource: event.billingAllocation?.source === 'PACKAGE' ? 'PACKAGE' : 'WALLET',
      purchasedPackageId: event.billingAllocation?.purchasedPackageId ?? undefined
    });
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const onSubmit = (data: EventFormValues) => {
    startTransition(async () => {
      try {
        const startDate = fromZonedTime(`${data.date}T${data.startTime}:00`, adminTimezone);
        const endDate = addMinutes(startDate, data.duration);

        if (
          formatInTimeZone(startDate, adminTimezone, 'yyyy-MM-dd HH:mm') !==
          `${data.date} ${data.startTime}`
        ) {
          throw new Error('Указанное время не существует из-за перехода часового пояса');
        }

        const payload = {
          title: data.title || '',
          type: data.type,
          status: data.status,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          userId,
          ...(shouldShowBilling && data.billingSource
            ? {
                billingSource: data.billingSource,
                purchasedPackageId:
                  data.billingSource === 'PACKAGE' ? data.purchasedPackageId : undefined
              }
            : {})
        };

        if (editingEvent) {
          await mutateEvent(`/api/admin/events/${editingEvent.id}`, 'PATCH', payload);
          toast.success('Запись обновлена');
        } else {
          await mutateEvent('/api/admin/events', 'POST', payload);
          toast.success('Запись добавлена');
        }
        setDialogOpen(false);
        router.refresh();
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Не удалось сохранить запись');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Вы действительно хотите удалить эту запись?')) return;

    startTransition(async () => {
      try {
        await mutateEvent(`/api/admin/events/${id}`, 'DELETE');
        toast.success('Запись удалена');
        router.refresh();
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Не удалось удалить запись');
      }
    });
  };

  const handleApprove = (event: ClientEvent) => {
    openEditDialog(event, 'SCHEDULED');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="secondary">Запланировано</Badge>;
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-600">
            Завершено
          </Badge>
        );
      case 'CANCELLED':
        return <Badge variant="destructive">Отменено</Badge>;
      case 'PENDING_CONFIRMATION':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Ожидает
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CONSULTATION':
        return 'Консультация';
      case 'FREE_SLOT':
        return 'Свободное окно';
      case 'DAY_OFF':
        return 'Выходной';
      case 'VACATION':
        return 'Отпуск';
      case 'SICK_LEAVE':
        return 'Больничный';
      case 'OTHER':
        return 'Другое';
      default:
        return type;
    }
  };

  const [showPastEvents, setShowPastEvents] = React.useState(false);

  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      if (showPastEvents) return true;
      const isPast = new Date(event.end) < new Date();
      const isCompletedOrCancelled = event.status === 'COMPLETED' || event.status === 'CANCELLED';
      return !isPast && !isCompletedOrCancelled;
    });
  }, [events, showPastEvents]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Записи клиента</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPastEvents(!showPastEvents)}
            className="text-muted-foreground"
          >
            {showPastEvents ? 'Скрыть прошедшие' : 'Показать все'}
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" /> Добавить запись
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата и Время</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {events.length === 0
                    ? 'У клиента пока нет записей в расписании.'
                    : 'Нет активных записей. Нажмите «Показать все», чтобы увидеть историю.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map(event => (
                <TableRow
                  key={event.id}
                  className={new Date(event.end) < new Date() ? 'opacity-60 bg-muted/30' : ''}
                >
                  <TableCell>
                    {formatInTimeZone(new Date(event.start), adminTimezone, 'd MMM yyyy, HH:mm', {
                      locale: ru
                    })}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({formatInTimeZone(new Date(event.start), adminTimezone, 'HH:mm')} -{' '}
                      {formatInTimeZone(new Date(event.end), adminTimezone, 'HH:mm')})
                    </span>
                  </TableCell>
                  <TableCell>{getTypeLabel(event.type)}</TableCell>
                  <TableCell>{event.title || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      {getStatusBadge(event.status)}
                      {event.type === 'CONSULTATION' && event.status === 'SCHEDULED' && (
                        <Badge
                          variant="outline"
                          className={
                            event.billingAllocation
                              ? 'text-muted-foreground'
                              : 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                          }
                        >
                          {event.billingAllocation
                            ? event.billingAllocation.source === 'PACKAGE'
                              ? 'Списано из пакета'
                              : 'Списано с баланса'
                            : 'Оплата не зафиксирована'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {event.status === 'PENDING_CONFIRMATION' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(event)}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Подтвердить и выбрать оплату
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(event)}
                        disabled={isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(event.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Редактировать запись' : 'Добавить запись'}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Внесите изменения в запись расписания.'
                : 'Создайте новую запись для данного клиента.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>
                              {getTypeLabel(type)}
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
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventStatusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {status === 'SCHEDULED'
                                ? 'Запланировано'
                                : status === 'COMPLETED'
                                  ? 'Завершено'
                                  : status === 'CANCELLED'
                                    ? 'Отменено'
                                    : 'Ожидает'}
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
                    <FormLabel>Тема (необязательно)</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Первичная сессия" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Дата</FormLabel>
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
                    <FormItem className="col-span-1">
                      <FormLabel>Время начала</FormLabel>
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
                    <FormItem className="col-span-1">
                      <FormLabel>Длительность</FormLabel>
                      <Select
                        onValueChange={val => field.onChange(parseInt(val))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Длительность" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 мин</SelectItem>
                          <SelectItem value="45">45 мин</SelectItem>
                          <SelectItem value="60">1 час</SelectItem>
                          <SelectItem value="90">1.5 часа</SelectItem>
                          <SelectItem value="120">2 часа</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedDate && selectedStartTime && (
                <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                  <p className="font-medium">Время администратора: {adminTimezone}</p>
                  <p className="mt-1 text-muted-foreground">
                    У клиента:{' '}
                    <span className="font-medium text-foreground">
                      {formatInTimeZone(
                        fromZonedTime(`${selectedDate}T${selectedStartTime}:00`, adminTimezone),
                        clientTimezone,
                        'd MMM yyyy, HH:mm',
                        { locale: ru }
                      )}
                      {' – '}
                      {formatInTimeZone(
                        addMinutes(
                          fromZonedTime(`${selectedDate}T${selectedStartTime}:00`, adminTimezone),
                          selectedDuration
                        ),
                        clientTimezone,
                        'HH:mm'
                      )}
                    </span>{' '}
                    ({clientTimezone})
                  </p>
                </div>
              )}

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

                  {editingEvent?.billingAllocation ? (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                      Источник уже зафиксирован:{' '}
                      <span className="font-medium">
                        {editingEvent.billingAllocation.source === 'PACKAGE'
                          ? 'купленный пакет'
                          : 'денежный баланс'}
                      </span>
                      . Для возврата отмените встречу.
                    </div>
                  ) : (
                    <>
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
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите источник" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="WALLET">Денежный баланс (EUR)</SelectItem>
                                <SelectItem
                                  value="PACKAGE"
                                  disabled={!financialSummary?.packages.length}
                                >
                                  Купленный пакет
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите пакет" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {financialSummary?.packages.map(purchasedPackage => (
                                    <SelectItem
                                      key={purchasedPackage.id}
                                      value={purchasedPackage.id}
                                      disabled={
                                        purchasedPackage.remainingMinutes < selectedDuration
                                      }
                                    >
                                      {purchasedPackage.title} · {purchasedPackage.remainingMinutes}{' '}
                                      мин.
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Будет списано {selectedDuration} минут. Пакеты с меньшим остатком
                                недоступны.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
