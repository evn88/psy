'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings } from 'lucide-react';
import { MultiEmailSelect } from '@/components/ui/multi-email-select';
import { EmailUser } from './actions';

// --- Схема валидации ---
const emailSchema = z
  .object({
    to: z.array(z.string().email({ message: 'Один из адресов имеет неверный формат' })),
    subject: z.string().min(1, { message: 'Тема обязательна' }),
    message: z.string().min(1, { message: 'Заполните текст сообщения' }),
    sendToAll: z.boolean()
  })
  .refine(data => data.sendToAll || data.to.length > 0, {
    message: 'Выберите хотя бы одного получателя',
    path: ['to']
  });

type EmailFormValues = z.infer<typeof emailSchema>;

/**
 * Отправляет запрос на отправку письма через API
 */
async function sendEmailRequest(data: EmailFormValues): Promise<void> {
  const response = await fetch('/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Ошибка при отправке письма');
  }
}

interface SendEmailFormProps {
  users: EmailUser[];
}

export interface DeliveryStatus {
  id?: string;
  email: string;
  success: boolean;
  status: 'queued' | 'delivered' | 'bounced' | 'complained' | 'rejected' | 'error' | 'sent';
  error?: string;
}

/**
 * Клиентская форма отправки писем
 */
export function SendEmailForm({ users }: SendEmailFormProps) {
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = React.useState<DeliveryStatus[] | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: [],
      subject: '',
      message: '',
      sendToAll: false
    }
  });

  const watchSendToAll = form.watch('sendToAll');
  const watchTo = form.watch('to');

  // --- Фоновый опрос (Polling) статусов ---
  React.useEffect(() => {
    if (!deliveryStatuses || deliveryStatuses.length === 0) return;

    // Ищем только те письма, которые еще в процессе
    const pendingIds = deliveryStatuses
      .filter(s => s.id && (s.status === 'queued' || s.status === 'sent'))
      .map(s => s.id as string);

    if (pendingIds.length === 0) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/send/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: pendingIds })
        });

        if (response.ok) {
          const { statuses } = await response.json();
          if (statuses) {
            setDeliveryStatuses(prev => {
              if (!prev) return prev;

              let hasChanges = false;
              const next = prev.map(item => {
                if (item.id && statuses[item.id] && item.status !== statuses[item.id]) {
                  hasChanges = true;
                  const newStatus = statuses[item.id];
                  const isError = ['bounced', 'complained', 'rejected', 'error'].includes(
                    newStatus
                  );
                  const isSuccess = newStatus === 'delivered';

                  return {
                    ...item,
                    status: newStatus,
                    success: isSuccess || (!isError && item.success), // Keep old success if pending
                    error: isError ? `Не доставлено (${newStatus})` : item.error
                  };
                }
                return item;
              });

              return hasChanges ? next : prev;
            });
          }
        }
      } catch (err) {
        console.error('Ошибка опроса статусов:', err);
      }
    }, 4000); // Опрос каждые 4 секунды

    return () => clearInterval(intervalId);
  }, [deliveryStatuses]);

  // --- Обработчики ---
  const handleTrigerConfirm = form.handleSubmit(() => {
    setIsConfirmOpen(true);
  });

  const handleConfirmSend = async () => {
    setIsConfirmOpen(false);
    setIsSending(true);
    setErrorMessage(null);
    setDeliveryStatuses(null);

    try {
      const data = form.getValues();
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Ошибка при отправке письма'
        );
      }

      if (result.statuses) {
        setDeliveryStatuses(result.statuses);
      }

      form.reset();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Произошла неизвестная ошибка');
    } finally {
      setIsSending(false);
    }
  };

  // --- Render ---
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Отправка писем</h2>
      </div>

      <Card className="max-w-2xl relative">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Новое письмо</CardTitle>
            <CardDescription>
              Отправьте письмо одному или всем пользователям напрямую. Письмо будет оформлено от
              имени администратора.
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Настройки рассылки"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px]">
              <div className="px-2 py-1.5 text-sm font-semibold">Настройки рассылки</div>
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="sendToAll"
                  render={({ field }) => (
                    <DropdownMenuCheckboxItem
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer font-medium py-2"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" />
                      Отправить всем пользователям
                    </DropdownMenuCheckboxItem>
                  )}
                />
              </Form>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="pt-4">
          {deliveryStatuses && (
            <div className="bg-muted text-foreground p-4 rounded-md mb-6 text-sm border space-y-2">
              <h3 className="font-semibold text-base mb-3">Статус рассылки:</h3>
              <ul className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {deliveryStatuses.map((item, index) => {
                  const isError = ['bounced', 'complained', 'rejected', 'error'].includes(
                    item.status
                  );
                  const isPending = ['queued', 'sent'].includes(item.status);
                  const isSuccess = item.status === 'delivered';

                  return (
                    <li
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-md bg-background border"
                    >
                      <span className="font-medium truncate mr-2" title={item.email}>
                        {item.email}
                      </span>
                      {isSuccess ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 hover:bg-green-100/80 shrink-0 w-fit"
                        >
                          Доставлено
                        </Badge>
                      ) : isPending ? (
                        <Badge
                          variant="outline"
                          className="text-yellow-600 border-yellow-300 bg-yellow-50 shrink-0 w-fit animate-pulse"
                        >
                          В процессе ({item.status})
                        </Badge>
                      ) : (
                        <div className="flex flex-col shrink-0 sm:items-end">
                          <Badge variant="destructive" className="w-fit">
                            Ошибка
                          </Badge>
                          <span className="text-xs text-red-600 mt-1 sm:text-right">
                            {item.error || 'Неизвестная ошибка'}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6 text-sm">
              {errorMessage}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={handleTrigerConfirm} className="space-y-6">
              {!watchSendToAll && (
                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кому (Email)</FormLabel>
                      <FormControl>
                        <MultiEmailSelect
                          options={users}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={watchSendToAll}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тема</FormLabel>
                    <FormControl>
                      <Input placeholder="Тема письма..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сообщение</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Текст сообщения..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSending}>
                {isSending ? 'Отправка...' : 'Отправить письмо'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              {watchSendToAll ? (
                <>
                  Вы собираетесь сделать <strong>массовую рассылку</strong> по всей базе
                  пользователей. Это действие нельзя отменить.
                </>
              ) : (
                <>
                  Вы собираетесь отправить письмо {watchTo.length} получателям. Это действие нельзя
                  отменить.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSend}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Подтвердить отправку
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
