'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { compressImage } from '@/lib/image-utils';
import { pilloMedicationSchema } from '@/modules/pillo/schemas';

import { savePilloMedicationAction, uploadPilloMedicationPhotoAction } from '../actions';
import type { PilloMedicationView } from '../_components/types';
import { usePilloOptimistic } from './use-pillo-optimistic';

type MedicationFormValues = z.input<typeof pilloMedicationSchema>;

const normalizeMedicationForm = (form: string | null | undefined) => {
  const normalizedForm = form?.toLowerCase().replace('.', '');

  if (!normalizedForm) {
    return 'tablet';
  }

  if (
    [
      'tablet',
      'capsule',
      'syrup',
      'drops',
      'injection',
      'powder',
      'ointment',
      'spray',
      'other'
    ].includes(normalizedForm)
  ) {
    return normalizedForm;
  }

  return normalizedForm.includes('табл') ? 'tablet' : 'other';
};

/**
 * Хук для управления формой таблетки (создание/редактирование).
 * @param medication - существующая таблетка для редактирования.
 * @returns Состояние диалога, форма и обработчики.
 */
export const usePilloMedicationForm = (medication?: PilloMedicationView) => {
  const t = useTranslations('Pillo');
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
      dosageUnit: medication?.dosageUnit?.replace('.', '') || 'mg',
      form: normalizeMedicationForm(medication?.form),
      packagesCount: medication?.packagesCount ?? 0,
      unitsPerPackage: medication?.unitsPerPackage ?? 20,
      stockUnits: medication?.stockUnits ?? 0,
      minThresholdUnits: medication?.minThresholdUnits ?? 15,
      isActive: medication?.isActive ?? true
    }
  });

  const packagesCount = useWatch({ control: form.control, name: 'packagesCount' });
  const unitsPerPackage = useWatch({ control: form.control, name: 'unitsPerPackage' });

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

    startTransition(async () => {
      try {
        const optimizedBlob = await compressImage(file);
        const optimizedFile = new File(
          [optimizedBlob],
          file.name.replace(/\.[^/.]+$/, '') + '.jpg',
          { type: 'image/jpeg' }
        );

        const formData = new FormData();
        formData.set('file', optimizedFile);
        const result = await uploadPilloMedicationPhotoAction(formData);

        if ('url' in result) {
          form.setValue('photoUrl', result.url, { shouldDirty: true });
          toast.success(t('medications.photoUploaded'));
        } else if ('error' in result) {
          toast.error(result.error);
        }
      } catch {
        const formData = new FormData();
        formData.set('file', file);
        const result = await uploadPilloMedicationPhotoAction(formData);
        if ('url' in result) {
          form.setValue('photoUrl', result.url, { shouldDirty: true });
          toast.success(t('medications.photoUploaded'));
        } else if ('error' in result) {
          toast.error(result.error);
        }
      }
    });
  };

  const onSubmit = (values: MedicationFormValues) => {
    startTransition(() => {
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

      void savePilloMedicationAction(values).then(result => {
        if (result.success) {
          setOpen(false);
        }
      });
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && !medication?.id) {
      setTimeout(() => form.reset(), 200); // delay to avoid visual jump during closing animation
    }
  };

  return {
    open,
    setOpen: handleOpenChange,
    isPending,
    form,
    onUploadPhoto,
    onSubmit: form.handleSubmit(onSubmit)
  };
};
