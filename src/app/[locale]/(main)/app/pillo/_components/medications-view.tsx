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
