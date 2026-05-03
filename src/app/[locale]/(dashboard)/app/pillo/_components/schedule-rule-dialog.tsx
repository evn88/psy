import { type ReactNode, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { deletePilloScheduleRuleAction } from '../actions';
import { usePilloScheduleForm } from '../_hooks/use-pillo-schedule-form';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { DateField, SwitchField, TextField, TimeField } from './form-fields';
import type { PilloMedicationView, PilloScheduleRuleView } from './types';

/**
 * Рисует форму правила расписания.
 * @param props - trigger, таблетки и редактируемое правило.
 * @returns Диалог формы расписания.
 */
export const ScheduleRuleDialog = ({
  children,
  medications,
  rule
}: {
  children: ReactNode;
  medications: PilloMedicationView[];
  rule?: PilloScheduleRuleView;
}) => {
  const t = useTranslations('Pillo');
  const {
    form,
    isPending: isFormPending,
    onSubmit,
    open,
    selectedDays,
    setOpen,
    toggleDay
  } = usePilloScheduleForm(medications, rule);
  const [isDeleting, startTransition] = useTransition();
  const isPending = isFormPending || isDeleting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{rule ? t('schedule.edit') : t('schedule.add')}</DialogTitle>
          <DialogDescription>{t('schedule.formDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="medicationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule.medication')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full rounded-2xl border bg-white/70 px-3 text-sm dark:bg-white/5">
                        <SelectValue placeholder={t('schedule.medication')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px] rounded-[1.25rem]">
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
            <TimeField control={form.control} name="time" label={t('schedule.time')} />
            <TextField
              control={form.control}
              name="doseUnits"
              label={t('schedule.dose')}
              type="number"
            />
            <div className="space-y-2">
              <Label>{t('schedule.days')}</Label>
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'h-10 rounded-full border text-xs font-medium',
                      selectedDays.includes(day)
                        ? 'border-foreground bg-foreground text-background'
                        : 'bg-background text-muted-foreground'
                    )}
                  >
                    {t(`daysShort.${day}`)}
                  </button>
                ))}
              </div>
            </div>
            <DateField control={form.control} name="startDate" label={t('schedule.startDate')} />
            <DateField
              control={form.control}
              name="endDate"
              label={t('schedule.endDate')}
              clearLabel={t('common.clear')}
              nullable
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule.comment')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={(field.value as string | null | undefined) ?? ''}
                      className="min-h-20 rounded-2xl bg-white/70 text-base dark:bg-white/5"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SwitchField control={form.control} name="isActive" label={t('schedule.isActive')} />
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isPending} className="h-12 w-full rounded-full">
                {t('common.save')}
              </Button>
              {rule && (
                <DeleteConfirmDialog
                  onConfirm={() => {
                    startTransition(() => {
                      void deletePilloScheduleRuleAction(rule.id).then(() => {
                        setOpen(false);
                      });
                    });
                  }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    className="h-12 w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </DeleteConfirmDialog>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
