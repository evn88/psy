'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DEFAULT_SESSION_REMINDER_MINUTES,
  MAX_SESSION_REMINDER_MINUTES,
  MIN_SESSION_REMINDER_MINUTES,
  SESSION_REMINDER_PRESET_MINUTES
} from '@/lib/session-reminders';

const bookingSchema = z.object({
  reminderMinutesBeforeStart: z
    .number()
    .int()
    .min(MIN_SESSION_REMINDER_MINUTES)
    .max(MAX_SESSION_REMINDER_MINUTES)
});

interface UserScheduleBookDialogProps {
  eventId: string | null;
  onClose: () => void;
  onConfirm: (id: string, reminderMinutesBeforeStart: number) => Promise<void>;
}

/**
 * Диалог подтверждения бронирования с выбором времени напоминания.
 */
export const UserScheduleBookDialog = ({
  eventId,
  onClose,
  onConfirm
}: UserScheduleBookDialogProps) => {
  const t = useTranslations('My');
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      reminderMinutesBeforeStart: DEFAULT_SESSION_REMINDER_MINUTES
    }
  });

  /**
   * Подтверждает бронь и передает выбранное время напоминания на сервер.
   * @param values - данные формы диалога бронирования.
   */
  const handleConfirm = async (values: z.infer<typeof bookingSchema>) => {
    if (!eventId) {
      return;
    }
    try {
      setIsLoading(true);
      await onConfirm(eventId, values.reminderMinutesBeforeStart);
      form.reset({ reminderMinutesBeforeStart: DEFAULT_SESSION_REMINDER_MINUTES });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Закрывает диалог и сбрасывает форму к значению по умолчанию.
   */
  const handleClose = () => {
    form.reset({ reminderMinutesBeforeStart: DEFAULT_SESSION_REMINDER_MINUTES });
    onClose();
  };

  return (
    <Dialog open={!!eventId} onOpenChange={open => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmBookingTitle')}</DialogTitle>
          <DialogDescription>{t('confirmBookingDesc')}</DialogDescription>
        </DialogHeader>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-md text-sm border border-yellow-200 dark:border-yellow-900/50">
          {t('bookingAdminWarning')}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-4">
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
                      {SESSION_REMINDER_PRESET_MINUTES.map(minutes => (
                        <SelectItem key={minutes} value={String(minutes)}>
                          {minutes === 0
                            ? t('sessionReminderAtStart')
                            : t('sessionReminderBeforeMinutes', { minutes })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading} type="button">
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('confirmButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
