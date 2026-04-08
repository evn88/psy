'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { updateNotificationSettings } from '../actions';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const formSchema = z.object({
  newIntake: z.boolean()
});

interface NotificationSettingsFormProps {
  initialSettings: any;
}

export const NotificationSettingsForm = ({ initialSettings }: NotificationSettingsFormProps) => {
  const t = useTranslations('Settings');
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newIntake: initialSettings?.newIntake !== false // defaults to true if undefined
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    const result = await updateNotificationSettings(values);
    setLoading(false);

    if (result.success) {
      toast.success('Настройки уведомлений сохранены');
    } else {
      toast.error('Не удалось сохранить настройки');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Управление email уведомлениями о новых событиях.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="newIntake"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Новые Анкеты Клиентов</FormLabel>
                    <FormDescription>
                      Получать письмо на email, когда новый клиент заполняет первичную анкету
                      (Intake Form).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};
