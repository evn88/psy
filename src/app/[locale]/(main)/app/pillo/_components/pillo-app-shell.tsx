'use client';

import { type ReactNode, useMemo, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import {
  Bell,
  CalendarClock,
  Check,
  Home,
  ImagePlus,
  Languages,
  Moon,
  MoreHorizontal,
  PackagePlus,
  Pill,
  Plus,
  Settings,
  SkipForward,
  Trash2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Control, type FieldValues, type Path, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { SettingsForm } from '@/app/[locale]/(main)/admin/settings/_components/settings-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  pilloMedicationSchema,
  pilloScheduleRuleSchema,
  pilloSettingsSchema
} from '@/features/pillo/lib/schemas';
import {
  deletePilloMedicationAction,
  deletePilloScheduleRuleAction,
  savePilloMedicationAction,
  savePilloScheduleRuleAction,
  savePilloSettingsAction,
  skipPilloIntakeAction,
  takePilloIntakeAction,
  uploadPilloMedicationPhotoAction
} from '../actions';
import type {
  PilloAppearanceSettingsView,
  PilloIntakeView,
  PilloMedicationView,
  PilloScheduleRuleView,
  PilloSettingsView
} from './types';

type PilloTab = 'home' | 'medications' | 'schedule' | 'settings';
type MedicationFormValues = z.input<typeof pilloMedicationSchema>;
type ScheduleRuleFormValues = z.input<typeof pilloScheduleRuleSchema>;
type SettingsFormValues = z.input<typeof pilloSettingsSchema>;

interface PilloAppShellProps {
  appearanceSettings: PilloAppearanceSettingsView;
  intakes: PilloIntakeView[];
  medications: PilloMedicationView[];
  scheduleRules: PilloScheduleRuleView[];
  settings: PilloSettingsView;
}

const tabs: Array<{ icon: typeof Home; id: PilloTab; labelKey: string }> = [
  { id: 'home', labelKey: 'tabs.home', icon: Home },
  { id: 'medications', labelKey: 'tabs.medications', icon: Pill },
  { id: 'schedule', labelKey: 'tabs.schedule', icon: CalendarClock },
  { id: 'settings', labelKey: 'tabs.settings', icon: Settings }
];

/**
 * Возвращает CSS-класс цветной полоски остатка.
 * @param status - статус остатка таблетки.
 * @returns Tailwind-классы градиента.
 */
const getStockGradientClass = (status: PilloMedicationView['stockStatus']): string => {
  if (status === 'empty') {
    return 'from-red-500 via-rose-500 to-orange-400';
  }

  if (status === 'low') {
    return 'from-amber-400 via-yellow-400 to-orange-300';
  }

  return 'from-emerald-400 via-lime-400 to-teal-300';
};

/**
 * Главный клиентский shell Pillo с нижней навигацией.
 * @param props - данные Pillo, подготовленные на сервере.
 * @returns Мобильный интерфейс мини-приложения.
 */
export const PilloAppShell = ({
  appearanceSettings,
  intakes,
  medications,
  scheduleRules,
  settings
}: PilloAppShellProps) => {
  const t = useTranslations('Pillo');
  const [activeTab, setActiveTab] = useState<PilloTab>('home');
  const todayPendingCount = intakes.filter(item => item.status === 'PENDING').length;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)),transparent_34%),hsl(var(--background))] pb-24">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-4 pt-3">
        <header className="sticky top-0 z-20 -mx-4 border-b border-white/40 bg-background/80 px-4 py-3 backdrop-blur-2xl dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('eyebrow')}
              </p>
              <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {t('pendingCount', { count: todayPendingCount })}
            </Badge>
          </div>
        </header>

        <main className="flex-1 py-4">
          {activeTab === 'home' && <TodayView intakes={intakes} />}
          {activeTab === 'medications' && <MedicationsView medications={medications} />}
          {activeTab === 'schedule' && (
            <ScheduleView medications={medications} scheduleRules={scheduleRules} />
          )}
          {activeTab === 'settings' && (
            <PilloSettingsView settings={settings} appearanceSettings={appearanceSettings} />
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-background/85 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-2xl dark:border-white/10">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.75rem] bg-muted/70 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[11px] font-medium text-muted-foreground transition',
                activeTab === tab.id && 'bg-background text-foreground shadow-sm'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

/**
 * Рисует главный экран сегодняшних приёмов.
 * @param props - приёмы текущего дня.
 * @returns Экран «Сегодня».
 */
const TodayView = ({ intakes }: { intakes: PilloIntakeView[] }) => {
  const t = useTranslations('Pillo');

  if (intakes.length === 0) {
    return <EmptyState icon={Home} title={t('today.emptyTitle')} text={t('today.emptyText')} />;
  }

  return (
    <div className="space-y-3">
      {intakes.map(intake => (
        <IntakeCard key={intake.id} intake={intake} />
      ))}
    </div>
  );
};

/**
 * Отображает карточку одного приёма.
 * @param props - данные приёма.
 * @returns Карточка с действиями «Принял» и «Пропустить».
 */
const IntakeCard = ({ intake }: { intake: PilloIntakeView }) => {
  const t = useTranslations('Pillo');
  const [isPending, startTransition] = useTransition();
  const isDone = intake.status !== 'PENDING';

  /**
   * Выполняет server action без блокировки интерфейса.
   * @param action - действие над приёмом.
   */
  const runAction = (action: () => Promise<unknown>) => {
    startTransition(() => {
      void action();
    });
  };

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
      <div className={cn('h-1.5 bg-gradient-to-r', getStockGradientClass(intake.stockStatus))} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{intake.medicationName}</CardTitle>
            <CardDescription>
              {intake.localTime} · {intake.doseUnits} x {intake.medicationDosage}
            </CardDescription>
          </div>
          <Badge variant={isDone ? 'secondary' : 'default'} className="rounded-full">
            {t(`intakeStatus.${intake.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {intake.comment && <p className="text-sm text-muted-foreground">{intake.comment}</p>}
        {intake.stockStatus !== 'enough' && (
          <div className="rounded-2xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            {t('today.lowStockWarning')}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={isDone || isPending}
            className="rounded-full"
            onClick={() => runAction(() => takePilloIntakeAction(intake.id))}
          >
            <Check className="mr-2 h-4 w-4" />
            {t('today.take')}
          </Button>
          <Button
            disabled={isDone || isPending}
            variant="outline"
            className="rounded-full"
            onClick={() => runAction(() => skipPilloIntakeAction(intake.id))}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {t('today.skip')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Рисует список таблеток и форму добавления.
 * @param props - список таблеток.
 * @returns Экран справочника таблеток.
 */
const MedicationsView = ({ medications }: { medications: PilloMedicationView[] }) => {
  const t = useTranslations('Pillo');

  return (
    <div className="space-y-4">
      <MedicationDialog>
        <Button className="h-12 w-full rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          {t('medications.add')}
        </Button>
      </MedicationDialog>

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={t('medications.emptyTitle')}
          text={t('medications.emptyText')}
        />
      ) : (
        <div className="space-y-3">
          {medications.map(medication => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Отображает карточку таблетки.
 * @param props - таблетка.
 * @returns Карточка остатка и действий.
 */
const MedicationCard = ({ medication }: { medication: PilloMedicationView }) => {
  const t = useTranslations('Pillo');
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
      <div className={cn('h-2 bg-gradient-to-r', getStockGradientClass(medication.stockStatus))} />
      <CardContent className="flex gap-3 p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
          {medication.photoUrl ? (
            <Image
              src={medication.photoUrl}
              alt={medication.name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <Pill className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{medication.name}</h3>
              <p className="text-sm text-muted-foreground">
                {medication.dosage} · {medication.form}
              </p>
            </div>
            <MedicationDialog medication={medication}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </MedicationDialog>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('medications.stock')}</span>
            <span className="font-medium">{medication.stockUnits}</span>
          </div>
          <Badge variant="secondary" className="mt-2 rounded-full">
            {t(`stockStatus.${medication.stockStatus}`)}
          </Badge>
        </div>
      </CardContent>
      <div className="px-4 pb-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="rounded-full text-destructive hover:text-destructive"
          onClick={() =>
            startTransition(() => {
              void deletePilloMedicationAction(medication.id);
            })
          }
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </Button>
      </div>
    </Card>
  );
};

/**
 * Рисует форму добавления или редактирования таблетки.
 * @param props - дочерний trigger и начальная таблетка.
 * @returns Диалог формы.
 */
const MedicationDialog = ({
  children,
  medication
}: {
  children: ReactNode;
  medication?: PilloMedicationView;
}) => {
  const t = useTranslations('Pillo');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(pilloMedicationSchema),
    defaultValues: {
      id: medication?.id,
      name: medication?.name ?? '',
      photoUrl: medication?.photoUrl ?? null,
      description: medication?.description ?? null,
      dosage: medication?.dosage ?? '',
      form: medication?.form ?? 'таблетка',
      packagesCount: medication?.packagesCount ?? 0,
      unitsPerPackage: medication?.unitsPerPackage ?? null,
      stockUnits: medication?.stockUnits ?? 0,
      minThresholdUnits: medication?.minThresholdUnits ?? 0,
      isActive: medication?.isActive ?? true
    }
  });

  /**
   * Загружает фото таблетки через server action.
   * @param file - выбранный файл.
   */
  const uploadPhoto = (file: File | null) => {
    if (!file) {
      return;
    }

    startTransition(() => {
      const formData = new FormData();
      formData.set('file', file);
      void uploadPilloMedicationPhotoAction(formData).then(result => {
        if ('url' in result) {
          form.setValue('photoUrl', result.url, { shouldDirty: true });
        }
      });
    });
  };

  /**
   * Сохраняет таблетку.
   * @param values - значения формы.
   */
  const onSubmit = (values: MedicationFormValues) => {
    startTransition(() => {
      void savePilloMedicationAction(values).then(result => {
        if (result.success) {
          setOpen(false);
        }
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{medication ? t('medications.edit') : t('medications.add')}</DialogTitle>
          <DialogDescription>{t('medications.formDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-sm">
                <ImagePlus className="mr-2 h-4 w-4" />
                {t('medications.gallery')}
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={event => uploadPhoto(event.target.files?.[0] ?? null)}
                />
              </Label>
              <Label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-sm">
                <ImagePlus className="mr-2 h-4 w-4" />
                {t('medications.camera')}
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={event => uploadPhoto(event.target.files?.[0] ?? null)}
                />
              </Label>
            </div>
            <TextField control={form.control} name="name" label={t('medications.name')} />
            <TextField control={form.control} name="dosage" label={t('medications.dosage')} />
            <TextField control={form.control} name="form" label={t('medications.form')} />
            <TextField
              control={form.control}
              name="packagesCount"
              label={t('medications.packagesCount')}
              type="number"
            />
            <TextField
              control={form.control}
              name="unitsPerPackage"
              label={t('medications.unitsPerPackage')}
              type="number"
            />
            <TextField
              control={form.control}
              name="stockUnits"
              label={t('medications.stockUnits')}
              type="number"
            />
            <TextField
              control={form.control}
              name="minThresholdUnits"
              label={t('medications.minThresholdUnits')}
              type="number"
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('medications.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={(field.value as string | null | undefined) ?? ''}
                      className="min-h-24 rounded-2xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SwitchField control={form.control} name="isActive" label={t('medications.isActive')} />
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
 * Рисует экран правил расписания.
 * @param props - таблетки и правила.
 * @returns Экран расписания.
 */
const ScheduleView = ({
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ScheduleRuleFormValues>({
    resolver: zodResolver(pilloScheduleRuleSchema),
    defaultValues: {
      id: rule?.id,
      medicationId: rule?.medicationId ?? medications[0]?.id ?? '',
      time: rule?.time ?? '09:00',
      doseUnits: rule?.doseUnits ?? 1,
      daysOfWeek: rule?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
      startDate: rule?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: rule?.endDate ?? null,
      comment: rule?.comment ?? null,
      isActive: rule?.isActive ?? true
    }
  });
  const selectedDays = useWatch({ control: form.control, name: 'daysOfWeek' }) ?? [];

  /**
   * Переключает день недели в форме.
   * @param day - ISO-день недели.
   */
  const toggleDay = (day: number) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter(item => item !== day)
      : [...selectedDays, day].sort();
    form.setValue('daysOfWeek', nextDays, { shouldDirty: true, shouldValidate: true });
  };

  /**
   * Сохраняет правило расписания.
   * @param values - значения формы.
   */
  const onSubmit = (values: ScheduleRuleFormValues) => {
    startTransition(() => {
      void savePilloScheduleRuleAction(values).then(result => {
        if (result.success) {
          setOpen(false);
        }
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{rule ? t('schedule.edit') : t('schedule.add')}</DialogTitle>
          <DialogDescription>{t('schedule.formDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
 * Рисует настройки Pillo и общие настройки темы/языка.
 * @param props - настройки уведомлений и внешнего вида.
 * @returns Экран настроек.
 */
const PilloSettingsView = ({
  appearanceSettings,
  settings
}: {
  appearanceSettings: PilloAppearanceSettingsView;
  settings: PilloSettingsView;
}) => {
  const t = useTranslations('Pillo');
  const [isPending, startTransition] = useTransition();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(pilloSettingsSchema),
    defaultValues: settings
  });
  const watchedValues = useWatch({ control: form.control });
  const values = { ...settings, ...watchedValues };

  const rows = useMemo(
    () =>
      [
        ['emailRemindersEnabled', 'settings.emailReminders', Bell],
        ['pushRemindersEnabled', 'settings.pushReminders', Bell],
        ['lowStockEmailEnabled', 'settings.lowStockEmail', PackagePlus],
        ['lowStockPushEnabled', 'settings.lowStockPush', PackagePlus]
      ] as const,
    []
  );

  /**
   * Сохраняет Pillo-настройки уведомлений.
   * @param nextValues - значения формы.
   */
  const saveSettings = (nextValues: SettingsFormValues) => {
    startTransition(() => {
      void savePilloSettingsAction(nextValues);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map(([name, labelKey, Icon]) => (
            <div key={name} className="flex items-center justify-between gap-4">
              <Label className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Label>
              <Switch
                checked={Boolean(values[name])}
                disabled={isPending}
                onCheckedChange={checked => {
                  const nextValues = { ...values, [name]: checked };
                  form.setValue(name, checked, { shouldDirty: true });
                  saveSettings(nextValues);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('settings.appearance')}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            {t('settings.appearanceDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialSettings={appearanceSettings} />
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Унифицированное текстовое поле для RHF.
 * @param props - control, имя, label и тип поля.
 * @returns Поле формы.
 */
const TextField = <TFieldValues extends FieldValues>({
  control,
  label,
  name,
  type = 'text'
}: {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
  type?: string;
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={(field.value as string | number | null | undefined) ?? ''}
              type={type}
              step={type === 'number' ? '0.01' : undefined}
              className="h-11 rounded-2xl"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/**
 * Унифицированный переключатель для RHF.
 * @param props - control, имя поля и подпись.
 * @returns Поле-переключатель.
 */
const SwitchField = <TFieldValues extends FieldValues>({
  control,
  label,
  name
}: {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-2xl border p-3">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

/**
 * Отображает пустое состояние раздела.
 * @param props - иконка, заголовок и текст.
 * @returns Карточка пустого состояния.
 */
const EmptyState = ({
  icon: Icon,
  text,
  title
}: {
  icon: typeof Home;
  text: string;
  title: string;
}) => {
  return (
    <Card className="rounded-[1.5rem] border-dashed bg-card/70">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
};
