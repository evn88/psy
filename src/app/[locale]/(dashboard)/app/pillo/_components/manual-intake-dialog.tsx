'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pill } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { z } from 'zod';

import { pilloManualIntakeSchema } from '@/modules/pillo/schemas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { toast } from 'sonner';

import { takePilloMedicationNowAction } from '../actions';
import { PilloPendingIndicator } from './pillo-pending-indicator';
import type { PilloMedicationView } from './types';

type ManualIntakeFormValues = z.input<typeof pilloManualIntakeSchema>;

/**
 * Диалог ручной отметки приёма таблетки.
 * @param props - список таблеток и триггер открытия.
 * @returns Диалог с выбором таблетки и количества.
 */
export const ManualIntakeDialog = ({
  children,
  medications
}: {
  children: React.ReactNode;
  medications: PilloMedicationView[];
}) => {
  const t = useTranslations('Pillo');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ManualIntakeFormValues>({
    resolver: zodResolver(pilloManualIntakeSchema),
    defaultValues: {
      medicationId: medications[0]?.id ?? '',
      doseUnits: 1
    }
  });

  const onSubmit = (values: ManualIntakeFormValues) => {
    startTransition(() => {
      void takePilloMedicationNowAction(values)
        .then(result => {
          if (result.error) {
            toast.error(result.error);
            return;
          }

          if (result.success) {
            toast.success(t('today.manualTakeSuccess'));
            form.reset({
              medicationId: values.medicationId,
              doseUnits: 1
            });
            setOpen(false);
          }
        })
        .catch(() => {
          toast.error(t('today.manualTakeError'));
        });
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (!nextOpen) {
          form.reset({
            medicationId: medications[0]?.id ?? '',
            doseUnits: 1
          });
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-[1.75rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('today.manualTakeTitle')}</DialogTitle>
          <DialogDescription>{t('today.manualTakeDescription')}</DialogDescription>
        </DialogHeader>
        {isPending ? (
          <div className="rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <PilloPendingIndicator label={t('today.manualTakePending')} />
          </div>
        ) : null}

        <Form {...form}>
          <form
            className="space-y-4 pt-2"
            onSubmit={form.handleSubmit(onSubmit)}
            aria-busy={isPending}
          >
            <FormField
              control={form.control}
              name="medicationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('today.manualTakeMedication')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl bg-white/70 dark:bg-white/5">
                        <SelectValue placeholder={t('today.manualTakeMedicationPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      {medications.map(medication => (
                        <SelectItem
                          key={medication.id}
                          value={medication.id}
                          className="rounded-xl"
                        >
                          {medication.name}
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
              name="doseUnits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('today.manualTakeDose')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      className="h-11 rounded-2xl bg-white/70 dark:bg-white/5"
                      name={field.name}
                      ref={field.ref}
                      value={String(field.value ?? '')}
                      onBlur={field.onBlur}
                      onChange={event => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{t('today.manualTakeDoseHint')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full font-bold"
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending} className="h-11 flex-1 rounded-full">
                {isPending ? (
                  <PilloPendingIndicator label={t('today.manualTakePending')} />
                ) : (
                  <>
                    <Pill className="mr-2 h-4 w-4" />
                    {t('today.manualTakeAction')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
