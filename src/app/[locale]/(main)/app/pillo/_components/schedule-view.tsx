import { type ReactNode, useTransition } from 'react';
import { CalendarClock, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { deletePilloScheduleRuleAction } from '../actions';
import { usePilloScheduleForm } from '../_hooks/use-pillo-schedule-form';
import type { PilloMedicationView, PilloScheduleRuleView } from './types';
import { EmptyState } from './empty-state';
import { SwitchField, TextField } from './form-fields';

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
  const { form, isPending, onSubmit, open, selectedDays, setOpen, toggleDay } =
    usePilloScheduleForm(medications, rule);

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
                  <FormControl>
                    <select
                      {...field}
                      className="h-11 w-full rounded-2xl border bg-background px-3 text-sm"
                    >
                      {medications.map(medication => (
                        <option key={medication.id} value={medication.id}>
                          {medication.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
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
            <Button type="submit" disabled={isPending} className="h-12 w-full rounded-full">
              {t('common.save')}
            </Button>
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
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{rule.medicationName}</h3>
            <p className="text-sm text-muted-foreground">
              {rule.time} · {rule.doseUnits} ·{' '}
              {rule.daysOfWeek.map(day => t(`days.${day}`)).join(', ')}
            </p>
          </div>
          <ScheduleRuleDialog rule={rule} medications={medications}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </ScheduleRuleDialog>
        </div>
        {rule.comment && <p className="text-sm text-muted-foreground">{rule.comment}</p>}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="rounded-full text-destructive hover:text-destructive"
          onClick={() =>
            startTransition(() => {
              void deletePilloScheduleRuleAction(rule.id);
            })
          }
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </Button>
      </CardContent>
    </Card>
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
