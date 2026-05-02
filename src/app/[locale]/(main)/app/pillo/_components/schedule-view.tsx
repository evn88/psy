import { type ReactNode, useTransition } from 'react';
import Image from 'next/image';
import { CalendarClock, MoreHorizontal, Pill, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { deletePilloScheduleRuleAction } from '../actions';
import { usePilloScheduleForm } from '../_hooks/use-pillo-schedule-form';
import type { PilloMedicationView, PilloScheduleRuleView } from './types';
import { EmptyState } from './empty-state';
import { SwitchField, TextField } from './form-fields';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

/**
 * Рисует форму правила расписания.
 * @param props - trigger, таблетки и редактируемое правило.
 * @returns Диалог формы расписания.
 */
const ScheduleRuleDialog = ({
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
                      <SelectTrigger className="h-11 w-full rounded-2xl border bg-background px-3 text-sm">
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
            <TextField control={form.control} name="time" label={t('schedule.time')} type="time" />
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
            <TextField
              control={form.control}
              name="startDate"
              label={t('schedule.startDate')}
              type="date"
            />
            <TextField
              control={form.control}
              name="endDate"
              label={t('schedule.endDate')}
              type="date"
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
                      className="min-h-20 rounded-2xl"
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

/**
 * Отображает карточку правила расписания.
 * @param props - правило и таблетки.
 * @returns Карточка правила.
 */
const ScheduleRuleCard = ({
  medications,
  rule
}: {
  medications: PilloMedicationView[];
  rule: PilloScheduleRuleView;
}) => {
  const t = useTranslations('Pillo');

  return (
    <ScheduleRuleDialog rule={rule} medications={medications}>
      <Card
        role="button"
        tabIndex={0}
        className={cn(
          'group relative overflow-hidden rounded-[24px] border border-black/5 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60',
          !rule.isActive && 'opacity-60 grayscale-[0.3]'
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5 dark:bg-white/5 dark:border-white/10 backdrop-blur-md">
              {rule.medicationPhotoUrl ? (
                <Image
                  src={rule.medicationPhotoUrl}
                  alt={rule.medicationName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <Pill className="h-7 w-7 text-primary/40" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-semibold tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                    {rule.medicationName}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-muted-foreground/80">
                    <span className="text-foreground">{rule.time}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>
                      {rule.doseUnits} {t('schedule.doseUnitsShort')}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 rounded-full border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md',
                    rule.isActive
                      ? 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-muted/50 text-muted-foreground/70'
                  )}
                >
                  {rule.isActive ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <span
                  key={day}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                    rule.daysOfWeek.includes(day)
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-black/5 text-muted-foreground/50 dark:bg-white/5'
                  )}
                >
                  {t(`daysShort.${day}`)}
                </span>
              ))}
            </div>

            {rule.comment && (
              <p className="rounded-xl bg-black/5 dark:bg-white/5 p-3 text-[13px] italic text-muted-foreground/80">
                {rule.comment}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </ScheduleRuleDialog>
  );
};

/**
 * Рисует экран правил расписания.
 * @param props - таблетки и правила.
 * @returns Экран расписания.
 */
export const ScheduleView = ({
  medications,
  scheduleRules
}: {
  medications: PilloMedicationView[];
  scheduleRules: PilloScheduleRuleView[];
}) => {
  const t = useTranslations('Pillo');

  return (
    <div className="space-y-4">
      <ScheduleRuleDialog medications={medications}>
        <Button className="h-12 w-full rounded-full" disabled={medications.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          {t('schedule.add')}
        </Button>
      </ScheduleRuleDialog>
      {scheduleRules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('schedule.emptyTitle')}
          text={t('schedule.emptyText')}
        />
      ) : (
        <div className="space-y-3">
          {scheduleRules.map(rule => (
            <ScheduleRuleCard key={rule.id} rule={rule} medications={medications} />
          ))}
        </div>
      )}
    </div>
  );
};
