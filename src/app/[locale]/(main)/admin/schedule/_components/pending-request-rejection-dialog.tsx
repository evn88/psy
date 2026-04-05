'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import type { Event } from './use-events';

const rejectionSchema = z.object({
  reason: z.string().optional()
});

type RejectionFormValues = z.infer<typeof rejectionSchema>;

interface PendingRequestRejectionDialogProps {
  event: Event | null;
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason?: string) => Promise<void>;
}

/**
 * Модалка отклонения pending-запроса с необязательной причиной для письма пользователю.
 * @param props - состояние диалога и обработчик подтверждения.
 * @returns Диалог с формой отклонения.
 */
export const PendingRequestRejectionDialog = ({
  event,
  open,
  isSubmitting,
  onOpenChange,
  onSubmit
}: PendingRequestRejectionDialogProps) => {
  const t = useTranslations('Schedule');
  const form = useForm<RejectionFormValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      reason: ''
    }
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        reason: ''
      });
    }
  }, [form, open, event?.id]);

  /**
   * Отправляет форму отклонения и прокидывает нормализованную причину в родительский компонент.
   * @param values - значения формы.
   */
  const handleSubmit = async (values: RejectionFormValues): Promise<void> => {
    const normalizedReason = values.reason?.trim();

    await onSubmit(normalizedReason || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rejectRequestTitle')}</DialogTitle>
          <DialogDescription>{t('rejectRequestDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('rejectReasonLabel')} ({t('rejectReasonOptional').toLowerCase()})
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      maxLength={1000}
                      placeholder={t('rejectReasonPlaceholder')}
                      rows={5}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {t('rejectRequest')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
