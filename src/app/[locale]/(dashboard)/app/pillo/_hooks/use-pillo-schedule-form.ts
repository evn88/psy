'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { pilloScheduleRuleSchema } from '@/modules/pillo/schemas';
import { parsePilloAmount } from '@/modules/pillo/stock';
import { savePilloScheduleRuleAction } from '../actions';
import type { PilloMedicationView, PilloScheduleRuleView } from '../_components/types';
import { usePilloOptimistic } from './use-pillo-optimistic';

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
  const addOptimisticAction = usePilloOptimistic();

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

  const watchedDays = useWatch({ control: form.control, name: 'daysOfWeek' });
  const selectedDays = Array.isArray(watchedDays) ? watchedDays.map(Number) : [];

  const toggleDay = (day: number) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter(item => item !== day)
      : [...selectedDays, day].sort();
    form.setValue('daysOfWeek', nextDays, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = (values: ScheduleRuleFormValues) => {
    startTransition(() => {
      if (addOptimisticAction) {
        const selectedMed = medications.find(m => m.id === values.medicationId);

        const optimisticRule: PilloScheduleRuleView = {
          id: values.id || crypto.randomUUID(),
          medicationId: values.medicationId,
          medicationName: selectedMed?.name || '',
          medicationPhotoUrl: selectedMed?.photoUrl || null,
          time: values.time,
          doseUnits: parsePilloAmount(values.doseUnits) ?? 0,
          daysOfWeek: values.daysOfWeek.map(Number),
          startDate: values.startDate,
          endDate: values.endDate || null,
          comment: values.comment || null,
          isActive: Boolean(values.isActive ?? true)
        };

        if (values.id) {
          addOptimisticAction({ type: 'update_schedule', schedule: optimisticRule });
        } else {
          addOptimisticAction({ type: 'add_schedule', schedule: optimisticRule });
        }
      }

      void savePilloScheduleRuleAction(values).then(result => {
        if (result.success) {
          setOpen(false);
        }
      });
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && !rule?.id) {
      setTimeout(() => form.reset(), 200); // delay to avoid visual jump during closing animation
    }
  };

  return {
    open,
    setOpen: handleOpenChange,
    isPending,
    form,
    selectedDays,
    toggleDay,
    onSubmit: form.handleSubmit(onSubmit)
  };
};
