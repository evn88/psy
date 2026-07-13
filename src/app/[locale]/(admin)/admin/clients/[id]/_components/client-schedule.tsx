'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteClientEvent } from '../../_actions/clients.actions';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';

interface ClientEvent {
  id: string;
  title: string | null;
  start: Date;
  end: Date;
  type: string;
  status: string;
}

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { addClientEvent, updateClientEvent } from '../../_actions/clients.actions';
import type { EventStatus, EventType } from '@prisma/client';

const eventTypeOptions = ['CONSULTATION', 'OTHER'] as const;
const eventStatusOptions = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION'] as const;

const eventSchema = z.object({
  title: z.string().optional(),
  type: z.enum(eventTypeOptions),
  status: z.enum(eventStatusOptions),
  date: z.string().min(1, 'Обязательно'),
  startTime: z.string().min(1, 'Обязательно'),
  duration: z.number().min(15, 'Минимум 15 минут')
});

type EventFormValues = z.infer<typeof eventSchema>;

export function ClientSchedule({ userId, events }: { userId: string; events: ClientEvent[] }) {
  const [isPending, startTransition] = useTransition();
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
      duration: 60
    }
  });

  const openAddDialog = () => {
    form.reset({
      title: '',
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      duration: 60
    });
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: ClientEvent) => {
    const d = new Date(event.start);
    const e = new Date(event.end);
    const diffMins = Math.round((e.getTime() - d.getTime()) / 60000);

    form.reset({
      title: event.title || '',
      type: (['CONSULTATION', 'OTHER'].includes(event.type) ? event.type : 'OTHER') as
        | 'CONSULTATION'
        | 'OTHER',
      status: event.status as EventStatus,
      date: format(d, 'yyyy-MM-dd'),
      startTime: format(d, 'HH:mm'),
      duration: diffMins > 0 ? diffMins : 60
    });
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const onSubmit = (data: EventFormValues) => {
    startTransition(async () => {
      try {
        const startDate = new Date(`${data.date}T${data.startTime}`);
        const endDate = new Date(startDate.getTime() + data.duration * 60000);

        const payload = {
          title: data.title || '',
          type: data.type as EventType,
          status: data.status as EventStatus,
          start: startDate,
          end: endDate
        };

        if (editingEvent) {
          const res = await updateClientEvent(editingEvent.id, userId, payload);
          if (res.success) {
            toast.success('Запись обновлена');
            setDialogOpen(false);
            router.refresh();
          } else {
            toast.error('Ошибка при обновлении записи');
          }
        } else {
          const res = await addClientEvent(userId, payload);
          if (res.success) {
            toast.success('Запись добавлена');
            setDialogOpen(false);
            router.refresh();
          } else {
            toast.error('Ошибка при добавлении записи');
          }
        }
      } catch (err) {
        toast.error('Произошла непредвиденная ошибка');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Вы действительно хотите удалить эту запись?')) return;

    startTransition(async () => {
      const res = await deleteClientEvent(id, userId);
      if (res.success) {
        toast.success('Запись удалена');
        router.refresh();
      } else {
        toast.error('Ошибка при удалении записи');
      }
    });
  };

  const handleApprove = (event: ClientEvent) => {
    startTransition(async () => {
      const payload = {
        title: event.title || '',
        type: event.type as EventType,
        status: 'SCHEDULED' as EventStatus,
        start: new Date(event.start),
        end: new Date(event.end)
      };
      const res = await updateClientEvent(event.id, userId, payload);
      if (res.success) {
        toast.success('Запись подтверждена');
        router.refresh();
      } else {
        toast.error('Ошибка при подтверждении записи');
      }
    });
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
                    {format(new Date(event.start), 'd MMM yyyy, HH:mm', { locale: ru })}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({format(new Date(event.start), 'HH:mm')} -{' '}
                      {format(new Date(event.end), 'HH:mm')})
                    </span>
                  </TableCell>
                  <TableCell>{getTypeLabel(event.type)}</TableCell>
                  <TableCell>{event.title || '-'}</TableCell>
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
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
                          Подтвердить
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
        <DialogContent className="sm:max-w-[500px]">
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
                    <FormItem className="col-span-1">
                      <FormLabel>Время начала</FormLabel>
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
}
