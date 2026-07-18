'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, CheckCircle2, Mail, Megaphone, Send, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { EmailUser } from './actions';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { MultiEmailSelect } from '@/components/ui/multi-email-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { isSafeNotificationActionUrl } from '@/modules/notifications/schemas';
import { cn } from '@/lib/utils';

const PUSH_BODY_LIMIT = 178;
const MESSAGE_LIMIT = 500;

const deliveryChannels = ['email', 'push', 'inApp'] as const;
type DeliveryChannel = (typeof deliveryChannels)[number];

const broadcastSchema = z
  .object({
    to: z.array(z.email({ message: 'Некорректный email' })),
    subject: z.string().trim().min(1, 'Укажите заголовок').max(120),
    message: z.string().trim().min(1, 'Введите сообщение').max(MESSAGE_LIMIT),
    sendToAll: z.boolean(),
    actionUrl: z.union([
      z.literal(''),
      z.string().trim().refine(isSafeNotificationActionUrl, {
        message: 'Используйте внутреннюю ссылку вида /my/sessions'
      })
    ]),
    actionLabel: z.string().trim().max(40)
  })
  .refine(data => data.sendToAll || data.to.length > 0, {
    message: 'Выберите хотя бы одного получателя',
    path: ['to']
  })
  .refine(data => !data.actionLabel || Boolean(data.actionUrl), {
    message: 'Для подписи действия укажите ссылку',
    path: ['actionLabel']
  });

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

interface SendEmailFormProps {
  users: EmailUser[];
}

interface DeliveryStatus {
  id?: string;
  email: string;
  success: boolean;
  status: 'queued' | 'delivered' | 'bounced' | 'complained' | 'rejected' | 'error' | 'sent';
  error?: string;
}

interface BroadcastResult {
  tone: 'success' | 'error';
  message: string;
}

const channelIcons: Record<DeliveryChannel, typeof Mail> = {
  email: Mail,
  push: Smartphone,
  inApp: Bell
};

/** Унифицированная форма отправки email, push и persistent in-app уведомлений. */
export const SendEmailForm = ({ users }: SendEmailFormProps) => {
  const t = useTranslations('AdminBroadcast');
  const [channel, setChannel] = useState<DeliveryChannel>('email');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[] | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      to: [],
      subject: '',
      message: '',
      sendToAll: false,
      actionUrl: '',
      actionLabel: ''
    }
  });

  const sendToAll = form.watch('sendToAll');
  const selectedRecipients = form.watch('to');
  const subject = form.watch('subject');
  const message = form.watch('message');
  const actionUrl = form.watch('actionUrl');
  const actionLabel = form.watch('actionLabel');
  const ChannelIcon = channelIcons[channel];
  const recipientCount = sendToAll ? users.length : selectedRecipients.length;
  const messageLimit = channel === 'push' ? PUSH_BODY_LIMIT : MESSAGE_LIMIT;
  const isMessageOverLimit = message.length > messageLimit;

  useEffect(() => {
    if (!deliveryStatuses?.length) {
      return;
    }

    const pendingIds = deliveryStatuses
      .filter(status => status.id && ['queued', 'sent'].includes(status.status))
      .map(status => status.id as string);

    if (pendingIds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch('/api/send/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: pendingIds })
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { statuses?: Record<string, string> };
        if (!payload.statuses) {
          return;
        }

        setDeliveryStatuses(
          current =>
            current?.map(item => {
              const nextStatus = item.id ? payload.statuses?.[item.id] : undefined;
              if (!nextStatus || nextStatus === item.status) {
                return item;
              }

              const failed = ['bounced', 'complained', 'rejected', 'error'].includes(nextStatus);
              return {
                ...item,
                status: nextStatus as DeliveryStatus['status'],
                success: nextStatus === 'delivered' || (!failed && item.success),
                error: failed ? t('deliveryFailed', { status: nextStatus }) : item.error
              };
            }) || null
        );
      } catch {
        // Следующий polling повторит запрос, отдельное UI-сообщение здесь создаст лишний шум.
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [deliveryStatuses, t]);

  const openConfirmation = form.handleSubmit(() => {
    if (isMessageOverLimit) {
      setResult({ tone: 'error', message: t('messageTooLong', { limit: messageLimit }) });
      return;
    }
    setResult(null);
    setIsConfirmOpen(true);
  });

  const sendEmail = async (values: BroadcastFormValues): Promise<void> => {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: values.to,
        subject: values.subject,
        message: values.message,
        sendToAll: values.sendToAll
      })
    });
    const payload = (await response.json()) as {
      error?: string | { message?: string };
      statuses?: DeliveryStatus[];
    };
    if (!response.ok) {
      throw new Error(
        typeof payload.error === 'string' ? payload.error : payload.error?.message || t('sendError')
      );
    }
    setDeliveryStatuses(payload.statuses || null);
    setResult({ tone: 'success', message: t('emailQueued') });
  };

  const sendPush = async (values: BroadcastFormValues): Promise<void> => {
    const response = await fetch('/api/send/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: values.to,
        sendToAll: values.sendToAll,
        title: values.subject,
        message: values.message
      })
    });
    const payload = (await response.json()) as {
      error?: string;
      results?: Array<{ success: boolean }>;
    };
    if (!response.ok) {
      throw new Error(payload.error || t('sendError'));
    }
    const sent = payload.results?.filter(item => item.success).length || 0;
    const failed = payload.results?.filter(item => !item.success).length || 0;
    setResult({ tone: 'success', message: t('pushSent', { sent, failed }) });
  };

  const sendInApp = async (values: BroadcastFormValues): Promise<void> => {
    const response = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: values.to,
        sendToAll: values.sendToAll,
        title: values.subject,
        message: values.message,
        actionUrl: values.actionUrl || null,
        actionLabel: values.actionLabel || null
      })
    });
    const payload = (await response.json()) as { message?: string; created?: number };
    if (!response.ok) {
      throw new Error(payload.message || t('sendError'));
    }
    setResult({ tone: 'success', message: t('inAppCreated', { count: payload.created || 0 }) });
  };

  const confirmSend = async () => {
    setIsConfirmOpen(false);
    setIsSending(true);
    setResult(null);
    if (channel !== 'email') {
      setDeliveryStatuses(null);
    }

    try {
      const values = form.getValues();
      if (channel === 'email') {
        await sendEmail(values);
      } else if (channel === 'push') {
        await sendPush(values);
      } else {
        await sendInApp(values);
      }
    } catch (error) {
      setResult({
        tone: 'error',
        message: error instanceof Error ? error.message : t('sendError')
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-8 pb-12">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Megaphone className="size-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              {t('eyebrow')}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">{t('description')}</p>
        </div>
        <Badge variant="secondary" className="w-fit px-3 py-1.5 text-xs">
          {t('usersAvailable', { count: users.length })}
        </Badge>
      </header>

      <Tabs
        value={channel}
        onValueChange={value => {
          if (deliveryChannels.includes(value as DeliveryChannel)) {
            setChannel(value as DeliveryChannel);
            setResult(null);
            setDeliveryStatuses(null);
          }
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:w-fit">
          {deliveryChannels.map(item => {
            const Icon = channelIcons[item];
            return (
              <TabsTrigger key={item} value={item} className="gap-2 px-4 py-2">
                <Icon className="size-4" aria-hidden />
                {t(`channels.${item}.label`)}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ChannelIcon className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{t(`channels.${channel}.title`)}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(`channels.${channel}.description`)}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={openConfirmation} className="space-y-7 px-5 py-6 sm:px-7">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{t('audienceTitle')}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t('audienceDescription')}
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="sendToAll"
                    render={({ field }) => (
                      <FormItem className="flex shrink-0 items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={checked => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer text-sm font-normal text-muted-foreground">
                          {t('sendToAll')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {!sendToAll && (
                  <FormField
                    control={form.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultiEmailSelect
                            options={users}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('recipientsPlaceholder')}
                            ariaLabel={t('recipients')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="space-y-5 border-t pt-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('subject')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('subjectPlaceholder')} className="h-11" />
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
                      <FormLabel>{t('message')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('messagePlaceholder')}
                          className="min-h-44 resize-y leading-6"
                        />
                      </FormControl>
                      <div className="flex items-start justify-between gap-3">
                        <FormMessage />
                        <span
                          className={cn(
                            'ml-auto text-xs tabular-nums text-muted-foreground',
                            isMessageOverLimit && 'font-medium text-destructive'
                          )}
                        >
                          {message.length} / {messageLimit}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                {channel === 'inApp' && (
                  <div className="grid gap-4 rounded-xl bg-muted/25 p-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="actionUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('actionUrl')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="/my/sessions" />
                          </FormControl>
                          <FormDescription>{t('actionUrlDescription')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actionLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('actionLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('actionLabelPlaceholder')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {result && (
                <Alert variant={result.tone === 'error' ? 'destructive' : 'default'}>
                  {result.tone === 'success' && <CheckCircle2 className="size-4" aria-hidden />}
                  <AlertTitle>{result.tone === 'success' ? t('success') : t('error')}</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}

              {deliveryStatuses && (
                <div className="space-y-3 rounded-xl border p-4">
                  <h3 className="text-sm font-semibold">{t('deliveryStatus')}</h3>
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {deliveryStatuses.map(item => {
                      const failed = ['bounced', 'complained', 'rejected', 'error'].includes(
                        item.status
                      );
                      return (
                        <li
                          key={item.id || item.email}
                          className="flex items-center justify-between gap-3 rounded-lg bg-muted/25 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-sm">{item.email}</span>
                          <Badge variant={failed ? 'destructive' : 'secondary'}>
                            {t(`statuses.${item.status}`)}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 border-t pt-5">
                <p className="text-xs text-muted-foreground">
                  {t('recipientSummary', { count: recipientCount })}
                </p>
                <Button
                  type="submit"
                  disabled={isSending || isMessageOverLimit}
                  className="min-w-40"
                >
                  <Send className="size-4" aria-hidden />
                  {isSending ? t('sending') : t(`channels.${channel}.action`)}
                </Button>
              </div>
            </form>
          </Form>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{t('preview')}</h2>
              <Badge variant="outline">{t(`channels.${channel}.label`)}</Badge>
            </div>
            <div className="mt-5 space-y-3 rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChannelIcon className="size-3.5" aria-hidden />
                {t('recipientSummary', { count: recipientCount })}
              </div>
              <p className="break-words text-sm font-semibold">
                {subject || t('previewSubjectFallback')}
              </p>
              <p className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
                {message || t('previewMessageFallback')}
              </p>
              {channel === 'inApp' && actionUrl && (
                <span className="inline-flex rounded-md border px-2 py-1 text-xs font-medium">
                  {actionLabel || t('defaultActionLabel')}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground">
            {t(`channels.${channel}.hint`)}
          </div>
        </aside>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDescription', {
                channel: t(`channels.${channel}.label`),
                count: recipientCount
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend}>{t('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
