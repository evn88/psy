import { type ReactNode, useTransition } from 'react';
import Image from 'next/image';
import {
  Boxes,
  Droplets,
  FlaskConical,
  GlassWater,
  ImagePlus,
  MoreHorizontal,
  Pill,
  Syringe,
  Trash2,
  Wind,
  X
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
import { deletePilloMedicationAction } from '../actions';
import { usePilloMedicationForm } from '../_hooks/use-pillo-medication-form';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { TextField } from './form-fields';
import type { PilloMedicationView } from './types';

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
export const MedicationDialog = ({
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
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-black/[0.05] bg-muted/30 dark:border-white/[0.05]">
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
                        <SelectTrigger className="h-11 rounded-2xl bg-white/70 dark:bg-white/5">
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
                      <SelectTrigger className="h-11 rounded-2xl bg-white/70 dark:bg-white/5">
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
              integer
            />
            <TextField
              control={form.control}
              name="unitsPerPackage"
              label={t('medications.unitsPerPackage')}
              type="number"
              integer
            />
            <TextField
              control={form.control}
              name="stockUnits"
              label={t('medications.stockUnits')}
              description={t('medications.stockDescription')}
              type="number"
              integer
            />
            <TextField
              control={form.control}
              name="minThresholdUnits"
              label={`${t('medications.minThresholdUnits')} (в единицах)`}
              description={t('medications.minThresholdDescription')}
              type="number"
              integer
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
                      className="min-h-24 rounded-2xl bg-white/70 text-base dark:bg-white/5"
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
