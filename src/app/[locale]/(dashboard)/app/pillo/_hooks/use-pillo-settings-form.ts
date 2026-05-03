'use client';

import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
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
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(pilloSettingsSchema),
    defaultValues: settings
  });

  const watchedValues = useWatch({ control: form.control });
  const values = { ...settings, ...watchedValues };

  const onSave = (nextValues: SettingsFormValues) => {
    startTransition(() => {
      void savePilloSettingsAction(nextValues);
    });
  };

  const onToggle = (name: keyof SettingsFormValues, checked: boolean) => {
    const nextValues = { ...values, [name]: checked };
    form.setValue(name, checked, { shouldDirty: true });
    onSave(nextValues);
  };

  const onLowStockWarningDaysChange = (rawValue: string) => {
    const nextValue = Number(rawValue.replace(/\D/g, '') || 0);
    form.setValue('lowStockWarningDays', nextValue, { shouldDirty: true, shouldValidate: true });
  };

  const onLowStockWarningDaysBlur = () => {
    const nextValue = Number(form.getValues('lowStockWarningDays') ?? 0);
    const nextValues = { ...values, lowStockWarningDays: nextValue };
    onSave(nextValues);
  };

  return {
    form,
    values,
    isPending,
    onLowStockWarningDaysBlur,
    onLowStockWarningDaysChange,
    onToggle
  };
};
