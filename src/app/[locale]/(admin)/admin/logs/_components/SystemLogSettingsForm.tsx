'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/AlertDialog';
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
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { clearSystemLogs, updateSystemLogSettings } from '../actions';

const formSchema = z.object({
  apiRequestsEnabled: z.boolean(),
  aiErrorsEnabled: z.boolean(),
  paymentErrorsEnabled: z.boolean(),
  retentionDays: z.number().int().min(1).max(365)
});

type FormValues = z.infer<typeof formSchema>;

interface SystemLogSettingsFormProps {
  initialSettings: FormValues;
}

/**
 * Форма управления включением системного журнала по категориям.
 */
export const SystemLogSettingsForm = ({ initialSettings }: SystemLogSettingsFormProps) => {
  const [loading, setLoading] = useState(false);
  const [clearingMode, setClearingMode] = useState<'all' | 'retention' | null>(null);
  const [retentionDays, setRetentionDays] = useState(initialSettings.retentionDays);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSettings
  });

  /**
   * Сохраняет настройки системного журнала.
   * @param values - Значения формы.
   */
  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const result = await updateSystemLogSettings(values);
    setLoading(false);

    if (result.success) {
      toast.success('Настройки логирования сохранены.');
      return;
    }

    toast.error('Не удалось сохранить настройки логирования.');
  };

  /**
   * Удаляет записи системного журнала в выбранном режиме.
   * @param mode - Режим очистки.
   */
  const handleClearLogs = async (mode: 'all' | 'retention') => {
    setClearingMode(mode);
    const result = await clearSystemLogs({ mode });
    setClearingMode(null);

    if (result.success) {
      toast.success(`Удалено записей: ${result.deletedCount}.`);
      return;
    }

    toast.error('Не удалось очистить системный журнал.');
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Настройки логирования</CardTitle>
              <CardDescription>
                Управляют записью новых событий. Старые записи автоматически очищаются ежедневным
                Workflow по сроку хранения.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="apiRequestsEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <FormLabel>API-запросы</FormLabel>
                      <FormDescription>Записывать все обращения к `/api/**`.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aiErrorsEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <FormLabel>AI-ошибки</FormLabel>
                      <FormDescription>Записывать ошибки единого AI executor.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentErrorsEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <FormLabel>Ошибки платежей</FormLabel>
                      <FormDescription>
                        Записывать ошибки PayPal API и платежных интеграций.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="retentionDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Срок хранения</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={value => {
                        const nextRetentionDays = Number(value);
                        field.onChange(nextRetentionDays);
                        setRetentionDays(nextRetentionDays);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите срок" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="7">7 дней</SelectItem>
                        <SelectItem value="30">30 дней</SelectItem>
                        <SelectItem value="90">90 дней</SelectItem>
                        <SelectItem value="180">180 дней</SelectItem>
                        <SelectItem value="365">365 дней</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Используется кнопкой очистки старых записей в соседнем блоке.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Card>
        <CardHeader>
          <CardTitle>Очистка журнала</CardTitle>
          <CardDescription>
            Ежедневная автоочистка удаляет записи старше срока хранения. Здесь можно запустить
            очистку вручную.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                Удалить старше срока хранения
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить старые записи?</AlertDialogTitle>
                <AlertDialogDescription>
                  Будут удалены записи старше выбранного срока хранения: {retentionDays} дней.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  disabled={clearingMode !== null}
                  onClick={() => void handleClearLogs('retention')}
                >
                  {clearingMode === 'retention' ? 'Удаление...' : 'Удалить'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full justify-start">
                Очистить весь журнал
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Очистить весь системный журнал?</AlertDialogTitle>
                <AlertDialogDescription>
                  Будут удалены все записи журнала. Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={clearingMode !== null}
                  onClick={() => void handleClearLogs('all')}
                >
                  {clearingMode === 'all' ? 'Очистка...' : 'Очистить'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
