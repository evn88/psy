'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { pilloMedicationSchema } from '@/features/pillo/lib/schemas';
import { savePilloMedicationAction, uploadPilloMedicationPhotoAction } from '../actions';
import type { PilloMedicationView } from '../_components/types';

type MedicationFormValues = z.input<typeof pilloMedicationSchema>;

/**
 * Хук для управления формой таблетки (создание/редактирование).
 * @param medication - существующая таблетка для редактирования.
 * @returns Состояние диалога, форма и обработчики.
 */
export const usePilloMedicationForm = (medication?: PilloMedicationView) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      unitsPerPackage: medication?.unitsPerPackage ?? null,
      stockUnits: medication?.stockUnits ?? 0,
      minThresholdUnits: medication?.minThresholdUnits ?? 0,
      isActive: medication?.isActive ?? true
    }
  });

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
