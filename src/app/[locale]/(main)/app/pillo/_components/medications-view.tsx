import { type ReactNode, useTransition } from 'react';
import Image from 'next/image';
import {
  Boxes,
  Droplet,
  Droplets,
  FlaskConical,
  GlassWater,
  ImagePlus,
  MoreHorizontal,
  Pill,
  Plus,
  Syringe,
  Trash2,
  Wind,
  X
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { deletePilloMedicationAction, addPilloMedicationPackageAction } from '../actions';
import { usePilloMedicationForm } from '../_hooks/use-pillo-medication-form';
import type { PilloMedicationView } from './types';
import { EmptyState } from './empty-state';
import { getStockGradientClass } from './utils';
import { SwitchField, TextField } from './form-fields';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const DOSAGE_UNITS = [
  'mg',
  'ml',
  'mcg',
  'g',
  'drops',
  'puffs',
  'units',
  'tablets',
  'capsules',
  'other'
] as const;

const MEDICATION_FORMS = [
  { id: 'tablet', icon: Pill },
  { id: 'capsule', icon: Pill },
  { id: 'syrup', icon: GlassWater },
  { id: 'drops', icon: Droplets },
  { id: 'injection', icon: Syringe },
  { id: 'powder', icon: Boxes },
  { id: 'ointment', icon: FlaskConical },
  { id: 'spray', icon: Wind },
  { id: 'other', icon: MoreHorizontal }
] as const;

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
  const {
    form,
    isPending: isFormPending,
    onSubmit,
    onUploadPhoto,
    open,
    setOpen
  } = usePilloMedicationForm(medication);
  const [isDeleting, startTransition] = useTransition();
  const isPending = isFormPending || isDeleting;

  const photoUrl = form.watch('photoUrl');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{medication ? t('medications.edit') : t('medications.add')}</DialogTitle>
          <DialogDescription>{t('medications.formDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {photoUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted/30 border border-black/[0.05] dark:border-white/[0.05]">
                <Image src={photoUrl} alt="Preview" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity hover:opacity-100" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-xl"
                  onClick={() => form.setValue('photoUrl', null, { shouldDirty: true })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Label
                className={cn(
                  'flex cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-sm transition-colors hover:bg-muted/50',
                  isPending && 'pointer-events-none opacity-50'
                )}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                {t('medications.gallery')}
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isPending}
                  onChange={event => onUploadPhoto(event.target.files?.[0] ?? null)}
                />
              </Label>
              <Label
                className={cn(
                  'flex cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-sm transition-colors hover:bg-muted/50',
                  isPending && 'pointer-events-none opacity-50'
                )}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                {t('medications.camera')}
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={isPending}
                  onChange={event => onUploadPhoto(event.target.files?.[0] ?? null)}
                />
              </Label>
            </div>
            <TextField control={form.control} name="name" label={t('medications.name')} />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                control={form.control}
                name="dosageValue"
                label={t('medications.dosageValue')}
                type="number"
              />
              <FormField
                control={form.control}
                name="dosageUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('medications.dosageUnit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue placeholder={t('medications.dosageUnit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl">
                        {DOSAGE_UNITS.map(unit => (
                          <SelectItem key={unit} value={unit} className="rounded-xl">
                            {t(`dosageUnits.${unit}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="form"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('medications.form')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder={t('medications.form')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      {MEDICATION_FORMS.map(({ id, icon: Icon }) => (
                        <SelectItem key={id} value={id} className="rounded-xl">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{t(`medicationForms.${id}`)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <TextField
              control={form.control}
              name="packagesCount"
              label={t('medications.packagesCount')}
              type="number"
              integer={true}
            />
            <TextField
              control={form.control}
              name="unitsPerPackage"
              label={t('medications.unitsPerPackage')}
              type="number"
              integer={true}
            />
            <TextField
              control={form.control}
              name="stockUnits"
              label={t('medications.stockUnits')}
              description={t('medications.stockDescription')}
              type="number"
              integer={true}
            />
            <TextField
              control={form.control}
              name="minThresholdUnits"
              label={`${t('medications.minThresholdUnits')} (в единицах)`}
              description={t('medications.minThresholdDescription')}
              type="number"
              integer={true}
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
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isPending} className="h-12 w-full rounded-full">
                {t('common.save')}
              </Button>
              {medication && (
                <DeleteConfirmDialog
                  onConfirm={() => {
                    startTransition(() => {
                      void deletePilloMedicationAction(medication.id).then(() => {
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

const AddPackageConfirmDialog = ({
  children,
  onConfirm
}: {
  children: ReactNode;
  onConfirm: () => void;
}) => {
  const t = useTranslations('Pillo');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-[1.5rem]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('medications.addPackageConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('medications.addPackageConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('medications.addPackageBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Отображает карточку таблетки.
 * @param props - таблетка.
 * @returns Карточка остатка и действий.
 */
const MedicationCard = ({ medication }: { medication: PilloMedicationView }) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const stockPercentage = medication.unitsPerPackage
    ? Math.min((medication.stockUnits / medication.unitsPerPackage) * 100, 100)
    : null;

  return (
    <MedicationDialog medication={medication}>
      <Card
        role="button"
        tabIndex={0}
        className={cn(
          'group relative overflow-hidden rounded-[24px] border border-black/5 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60',
          medication.stockStatus === 'empty' && 'border-rose-200/50 dark:border-rose-900/30',
          medication.stockStatus === 'low' && 'border-amber-200/50 dark:border-amber-900/30'
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5 dark:bg-white/5 dark:border-white/10 backdrop-blur-md">
              {medication.photoUrl ? (
                <Image
                  src={medication.photoUrl}
                  alt={medication.name}
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
                <h3 className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                  {medication.name}
                </h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 rounded-full border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md',
                    medication.stockStatus === 'enough' &&
                      'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
                    medication.stockStatus === 'low' &&
                      'bg-amber-100/60 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
                    medication.stockStatus === 'empty' &&
                      'bg-rose-100/60 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                  )}
                >
                  {t(`stockStatus.${medication.stockStatus}`)}
                </Badge>
              </div>

              <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground/80">
                {medication.dosageValue !== null && medication.dosageUnit ? (
                  <>
                    {medication.dosageValue}{' '}
                    {t(`dosageUnits.${medication.dosageUnit.toLowerCase().replace('.', '')}`)}
                  </>
                ) : (
                  medication.dosage
                )}
                <span className="mx-1.5 text-muted-foreground/40">•</span>
                {t.raw(`medicationForms`)?.[medication.form.toLowerCase().replace('.', '')] ||
                  medication.form}
              </p>

              {medication.buyAtDate !== null && (
                <p
                  className={cn(
                    'mt-1 truncate text-xs font-bold',
                    medication.stockStatus === 'enough' && 'text-emerald-600 dark:text-emerald-400',
                    medication.stockStatus === 'low' && 'text-amber-600 dark:text-amber-400',
                    medication.stockStatus === 'empty' && 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {t('today.buyAtDate', {
                    date: new Intl.DateTimeFormat(locale, {
                      month: 'short',
                      day: 'numeric'
                    }).format(new Date(medication.buyAtDate))
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-foreground/90">
                    {medication.stockUnits}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t('schedule.doseUnitsShort')}
                  </span>
                  {medication.daysLeft !== null && (
                    <span className="ml-1.5 text-xs font-semibold text-muted-foreground/70">
                      ({t('today.daysLeft', { count: medication.daysLeft })})
                    </span>
                  )}
                </div>
                {medication.unitsPerPackage && stockPercentage !== null && (
                  <span className="text-[11px] font-bold text-muted-foreground/50">
                    {Math.round(stockPercentage)}%
                  </span>
                )}
              </div>

              {stockPercentage !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-out',
                      medication.stockStatus === 'enough'
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : medication.stockStatus === 'low'
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-rose-500 dark:bg-rose-400'
                    )}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              )}
            </div>

            <div
              className="flex shrink-0 items-center gap-1.5 pb-0.5"
              onClick={e => e.stopPropagation()}
            >
              {medication.unitsPerPackage ? (
                <AddPackageConfirmDialog
                  onConfirm={() => {
                    startTransition(() => {
                      void addPilloMedicationPackageAction(medication.id);
                    });
                  }}
                >
                  <Button
                    variant="default"
                    size="icon"
                    disabled={isPending}
                    className="h-8 w-8 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </AddPackageConfirmDialog>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </MedicationDialog>
  );
};

/**
 * Рисует список таблеток и форму добавления.
 * @param props - список таблеток.
 * @returns Экран справочника таблеток.
 */
export const MedicationsView = ({ medications }: { medications: PilloMedicationView[] }) => {
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
