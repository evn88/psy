import { type ReactNode, useTransition } from 'react';
import Image from 'next/image';
import { ImagePlus, MoreHorizontal, Pill, Plus, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { deletePilloMedicationAction } from '../actions';
import { usePilloMedicationForm } from '../_hooks/use-pillo-medication-form';
import type { PilloMedicationView } from './types';
import { EmptyState } from './empty-state';
import { getStockGradientClass } from './utils';
import { SwitchField, TextField } from './form-fields';

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
  const { form, isPending, onSubmit, onUploadPhoto, open, setOpen } =
    usePilloMedicationForm(medication);

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
            <div className="grid grid-cols-2 gap-2">
              <Label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-sm">
                <ImagePlus className="mr-2 h-4 w-4" />
                {t('medications.gallery')}
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={event => onUploadPhoto(event.target.files?.[0] ?? null)}
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
                  onChange={event => onUploadPhoto(event.target.files?.[0] ?? null)}
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
 * Отображает карточку таблетки.
 * @param props - таблетка.
 * @returns Карточка остатка и действий.
 */
const MedicationCard = ({ medication }: { medication: PilloMedicationView }) => {
  const t = useTranslations('Pillo');
  const [isPending, startTransition] = useTransition();

  const stockPercentage = medication.unitsPerPackage
    ? Math.min((medication.stockUnits / medication.unitsPerPackage) * 100, 100)
    : null;

  return (
    <MedicationDialog medication={medication}>
      <Card
        role="button"
        tabIndex={0}
        className="group relative overflow-hidden rounded-[1.75rem] border-white/40 bg-white/60 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 active:scale-[0.98] dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30"
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-60',
            getStockGradientClass(medication.stockStatus)
          )}
        />
        <CardContent className="flex gap-4 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/50 backdrop-blur-sm shadow-inner">
            {medication.photoUrl ? (
              <Image
                src={medication.photoUrl}
                alt={medication.name}
                width={64}
                height={64}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <Pill className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold tracking-tight text-foreground">
                  {medication.name}
                </h3>
                <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
                  {medication.dosage} · {medication.form}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  'shrink-0 rounded-full border-none px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur-md',
                  medication.stockStatus === 'enough' && 'bg-emerald-500/15 text-emerald-600',
                  medication.stockStatus === 'low' && 'bg-amber-500/15 text-amber-600',
                  medication.stockStatus === 'empty' && 'bg-rose-500/15 text-rose-600'
                )}
              >
                {t(`stockStatus.${medication.stockStatus}`)}
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-end justify-between text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {t('medications.stock')}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {medication.stockUnits}{' '}
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {t('schedule.doseUnitsShort')}
                    </span>
                  </span>
                </div>
                {medication.unitsPerPackage && (
                  <span className="text-[10px] font-bold text-muted-foreground/60">
                    {Math.round(stockPercentage || 0)}%
                  </span>
                )}
              </div>

              {stockPercentage !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className={cn(
                      'h-full transition-all duration-700 ease-out',
                      medication.stockStatus === 'enough'
                        ? 'bg-emerald-500'
                        : medication.stockStatus === 'low'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    )}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-black/[0.03] pt-2 dark:border-white/[0.03]">
              <div className="flex items-center gap-1.5">
                {!medication.isActive && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-muted-foreground/20 text-[9px] font-bold uppercase text-muted-foreground/60"
                  >
                    {t('common.inactive')}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                className="h-7 rounded-full px-2.5 text-[10px] font-bold text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                onClick={e => {
                  e.stopPropagation();
                  startTransition(() => {
                    void deletePilloMedicationAction(medication.id);
                  });
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {t('common.delete')}
              </Button>
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
