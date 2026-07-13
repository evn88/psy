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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const emailSchema = z.object({
  subject: z.string().min(1, { message: 'Тема обязательна' }),
  message: z.string().min(1, { message: 'Заполните текст сообщения' })
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface ClientMessagesProps {
  email: string;
}

export function ClientMessages({ email }: ClientMessagesProps) {
  const [isSending, setIsSending] = React.useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: '',
      message: ''
    }
  });

  const onSubmit = async (data: EmailFormValues) => {
    setIsSending(true);

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [email],
          subject: data.subject,
          message: data.message,
          sendToAll: false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Ошибка при отправке письма'
        );
      }

      toast.success('Письмо успешно отправлено');
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Произошла неизвестная ошибка');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Отправить сообщение</CardTitle>
        <CardDescription>
          Отправьте персональное письмо этому клиенту на адрес{' '}
          <span className="font-semibold">{email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тема письма</FormLabel>
                  <FormControl>
                    <Input placeholder="Например, Информация по вашей консультации" {...field} />
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
                  <FormLabel>Текст сообщения</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Здравствуйте..." className="min-h-[150px]" {...field} />
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
  );
}
