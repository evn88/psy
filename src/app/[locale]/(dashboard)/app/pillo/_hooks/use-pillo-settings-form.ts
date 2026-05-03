'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { useRouter } from '@/i18n/navigation';
import { pilloSettingsSchema } from '@/modules/pillo/schemas';
import { savePilloSettingsAction } from '../actions';
import type { PilloSettingsView } from '../_components/types';

type SettingsFormValues = z.input<typeof pilloSettingsSchema>;

/**
 * Хук для управления настройками Pillo.
 * @param settings - начальные настройки.
 * @returns Форма, значения и обработчик сохранения.
 */
export const usePilloSettingsForm = (settings: PilloSettingsView) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(pilloSettingsSchema),
    defaultValues: settings
  });

  useEffect(() => {
    form.reset(settings);
  }, [form, settings]);

  const watchedValues = useWatch({ control: form.control });
  const values = { ...settings, ...watchedValues };

  const onSubmit = async (options?: { refresh?: boolean }) => {
    await form.handleSubmit(async nextValues => {
      setIsPending(true);

      try {
        const result = await savePilloSettingsAction(nextValues);

        if (!result.success) {
          return;
        }

        form.reset(nextValues);
        if (options?.refresh !== false) {
          router.refresh();
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  const onToggle = (name: keyof SettingsFormValues, checked: boolean) => {
    form.setValue(name, checked, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  };

  const onLowStockWarningDaysChange = (rawValue: string) => {
    const nextValue = Number(rawValue.replace(/\D/g, '') || 0);
    form.setValue('lowStockWarningDays', nextValue, { shouldDirty: true, shouldValidate: true });
  };

  const onLowStockWarningDaysBlur = () => {
    const nextValue = Number(form.getValues('lowStockWarningDays') ?? 0);
    form.setValue('lowStockWarningDays', Math.max(0, nextValue), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  };

  return {
    form,
    values,
    isPending,
    isDirty: form.formState.isDirty,
    onLowStockWarningDaysBlur,
    onLowStockWarningDaysChange,
    onSubmit,
    onToggle
  };
};
