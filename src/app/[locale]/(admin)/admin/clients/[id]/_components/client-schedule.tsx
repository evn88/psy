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
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteClientEvent } from '../../_actions/clients.actions';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
// Note: In a complete implementation, a real dialog form would be used here.
// For now, we will add basic functionality.

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

const eventTypeOptions = [
  'CONSULTATION',
  'FREE_SLOT',
  'DAY_OFF',
  'VACATION',
  'SICK_LEAVE',
  'OTHER'
] as const;
const eventStatusOptions = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'PENDING_CONFIRMATION'] as const;

const eventSchema = z.object({
  title: z.string().optional(),
  type: z.enum(eventTypeOptions),
  status: z.enum(eventStatusOptions),
  start: z.string().min(1, 'Обязательно'),
  end: z.string().min(1, 'Обязательно')
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
      start: '',
      end: ''
    }
  });

  const openAddDialog = () => {
    form.reset({
      title: '',
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
    });
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: ClientEvent) => {
    form.reset({
      title: event.title || '',
      type: event.type as EventType,
      status: event.status as EventStatus,
      start: format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(event.end), "yyyy-MM-dd'T'HH:mm")
    });
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const onSubmit = (data: EventFormValues) => {
    startTransition(async () => {
      try {
        const payload = {
          title: data.title || '',
          type: data.type as EventType,
          status: data.status as EventStatus,
          start: new Date(data.start),
          end: new Date(data.end)
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
      case 'OTHER':
        return 'Другое';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Записи клиента</h3>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" /> Добавить запись
        </Button>
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
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  У клиента пока нет записей в расписании.
                </TableCell>
              </TableRow>
            ) : (
              events.map(event => (
                <TableRow key={event.id}>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Начало</FormLabel>
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
                      <FormLabel>Окончание</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
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
