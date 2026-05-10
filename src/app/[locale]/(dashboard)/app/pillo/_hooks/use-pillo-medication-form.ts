'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { pilloMedicationSchema } from '@/modules/pillo/schemas';
import { savePilloMedicationAction, uploadPilloMedicationPhotoAction } from '../actions';
import type { PilloMedicationView } from '../_components/types';
import { usePilloOptimistic } from './use-pillo-optimistic';

type MedicationFormValues = z.input<typeof pilloMedicationSchema>;

/**
 * Хук для управления формой таблетки (создание/редактирование).
 * @param medication - существующая таблетка для редактирования.
 * @returns Состояние диалога, форма и обработчики.
 */
export const usePilloMedicationForm = (medication?: PilloMedicationView) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addOptimisticAction = usePilloOptimistic();

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(pilloMedicationSchema),
    defaultValues: {
      id: medication?.id,
      name: medication?.name ?? '',
      photoUrl: medication?.photoUrl ?? null,
      description: medication?.description ?? null,
      dosageValue: medication?.dosageValue ?? 1,
      dosageUnit: (medication?.dosageUnit?.replace('.', '') || 'mg') as any,
      form: medication?.form
        ? [
            'tablet',
            'capsule',
            'syrup',
            'drops',
            'injection',
            'powder',
            'ointment',
            'spray',
            'other'
          ].includes(medication.form.toLowerCase().replace('.', ''))
          ? medication.form.toLowerCase().replace('.', '')
          : medication.form.toLowerCase().includes('табл')
            ? 'tablet'
            : 'other'
        : 'tablet',
      packagesCount: medication?.packagesCount ?? 0,
      unitsPerPackage: medication?.unitsPerPackage ?? 20,
      stockUnits: medication?.stockUnits ?? 0,
      minThresholdUnits: medication?.minThresholdUnits ?? 15,
      isActive: medication?.isActive ?? true
    }
  });

  const packagesCount = form.watch('packagesCount');
  const unitsPerPackage = form.watch('unitsPerPackage');

  // Автоматический расчет остатка в единицах только при создании
  useEffect(() => {
    if (!medication?.id) {
      const pCount = Number(packagesCount) || 0;
      const uCount = Number(unitsPerPackage) || 0;
      form.setValue('stockUnits', pCount * uCount, { shouldDirty: true, shouldValidate: true });
    }
  }, [packagesCount, unitsPerPackage, form, medication?.id]);

  const onUploadPhoto = (file: File | null) => {
    if (!file) return;

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

  const onSubmit = (values: MedicationFormValues) => {
    if (addOptimisticAction) {
      const optimisticMedication = {
        id: values.id || crypto.randomUUID(),
        name: values.name,
        photoUrl: values.photoUrl || null,
        description: values.description || null,
        dosage: `${values.dosageValue} ${values.dosageUnit}`,
        dosageValue: values.dosageValue ? Number(values.dosageValue) : null,
        dosageUnit: values.dosageUnit || null,
        form: values.form,
        packagesCount: values.packagesCount ? Number(values.packagesCount) : 0,
        unitsPerPackage: values.unitsPerPackage ? Number(values.unitsPerPackage) : null,
        stockUnits: values.stockUnits ? Number(values.stockUnits) : 0,
        minThresholdUnits: values.minThresholdUnits ? Number(values.minThresholdUnits) : 0,
        isActive: Boolean(values.isActive ?? true)
      };

      if (values.id) {
        addOptimisticAction({ type: 'update_medication', medication: optimisticMedication });
      } else {
        addOptimisticAction({ type: 'add_medication', medication: optimisticMedication });
      }
    }

    startTransition(() => {
      void savePilloMedicationAction(values).then(result => {
        if (result.success) {
          setOpen(false);
        }
      });
    });
  };

  return {
    open,
    setOpen,
    isPending,
    form,
    onUploadPhoto,
    onSubmit: form.handleSubmit(onSubmit)
  };
};
