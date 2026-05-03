'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { pilloScheduleRuleSchema } from '@/modules/pillo/schemas';
import { savePilloScheduleRuleAction } from '../actions';
import type { PilloMedicationView, PilloScheduleRuleView } from '../_components/types';

type ScheduleRuleFormValues = z.input<typeof pilloScheduleRuleSchema>;

/**
 * Хук для управления формой правила расписания.
 * @param medications - список доступных таблеток.
 * @param rule - существующее правило для редактирования.
 * @returns Состояние диалога, форма и обработчики.
 */
export const usePilloScheduleForm = (
  medications: PilloMedicationView[],
  rule?: PilloScheduleRuleView
) => {
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

  const toggleDay = (day: number) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter(item => item !== day)
      : [...selectedDays, day].sort();
    form.setValue('daysOfWeek', nextDays, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = (values: ScheduleRuleFormValues) => {
    startTransition(() => {
      void savePilloScheduleRuleAction(values).then(result => {
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
    selectedDays,
    toggleDay,
    onSubmit: form.handleSubmit(onSubmit)
  };
};
