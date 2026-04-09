'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ConsentSection } from '@/shared/ui/consent-section';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { submitIntake, recordConsent } from '../_actions/intake.actions';
import { Progress } from '@/components/ui/progress';
import { INTAKE_TOTAL_STEPS, INTAKE_FORM_ID } from '@/configs/intake';

/**
 * Модальное окно с многошаговым мастером заполнения первичной анкеты (Intake).
 * Использует React Hook Form для валидации каждого шага.
 */
export function IntakeWizardModal({ triggerText }: { triggerText?: string }) {
  const t = useTranslations('IntakeWizard');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [canSubmit, setCanSubmit] = useState(false);

  React.useEffect(() => {
    if (step === INTAKE_TOTAL_STEPS) {
      setCanSubmit(false);
      const timer = setTimeout(() => {
        setCanSubmit(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(2, 'Минимум 2 символа'),
        age: z
          .number({ message: 'Некорректный возраст' })
          .min(12, 'От 12 лет')
          .max(120, 'Некорректный возраст'),
        mainRequest: z.string().min(10, 'Подробно опишите, пожалуйста (от 10 символов)'),
        requestChecklist: z.array(z.string()),
        comment: z.string().optional(),
        consent: z.boolean().refine(val => val === true, {
          message: 'Обязательное поле'
        })
      }),
    []
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      age: undefined as unknown as number,
      mainRequest: '',
      requestChecklist: [],
      comment: '',
      consent: false
    },
    mode: 'onChange'
  });

  const isConsentChecked = form.watch('consent');

  const checklistOptions = [
    { id: 'masking_identity', label: t('checklist.masking_identity') },
    { id: 'self_comparison', label: t('checklist.self_comparison') },
    { id: 'self_acceptance', label: t('checklist.self_acceptance') },
    { id: 'self_esteem', label: t('checklist.self_esteem') },
    { id: 'loneliness', label: t('checklist.loneliness') },
    { id: 'anxiety', label: t('checklist.anxiety') },
    { id: 'sleep_issues', label: t('checklist.sleep_issues') },
    { id: 'emigration', label: t('checklist.emigration') },
    { id: 'career_lost', label: t('checklist.career_lost') },
    { id: 'work_cycle', label: t('checklist.work_cycle') },
    { id: 'procrastination', label: t('checklist.procrastination') },
    { id: 'loneliness_people', label: t('checklist.loneliness_people') },
    { id: 'emotional_outbursts', label: t('checklist.emotional_outbursts') },
    { id: 'negative_loop', label: t('checklist.negative_loop') },
    { id: 'burnout', label: t('checklist.burnout') },
    { id: 'motivation', label: t('checklist.motivation') },
    { id: 'goals', label: t('checklist.goals') },
    { id: 'daily_load', label: t('checklist.daily_load') },
    { id: 'asd', label: t('checklist.asd') },
    { id: 'adhd', label: t('checklist.adhd') },
    { id: 'binge_eating', label: t('checklist.binge_eating') },
    { id: 'bulimia', label: t('checklist.bulimia') },
    { id: 'other', label: t('checklist.other') }
  ];

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ['consent'];
    if (step === 2) fieldsToValidate = ['name', 'age'];
    if (step === 3) fieldsToValidate = ['mainRequest'];
    if (step === 4) fieldsToValidate = ['requestChecklist'];

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(prev => Math.min(prev + 1, INTAKE_TOTAL_STEPS));
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = (data: FormValues) => {
    if (step !== INTAKE_TOTAL_STEPS) {
      handleNext();
      return;
    }

    startTransition(async () => {
      const consentRes = await recordConsent('INTAKE_SUBMIT');
      if (!consentRes.success) {
        toast.error(t('error'));
        return;
      }

      const { consent, ...answers } = data;
      const intakeRes = await submitIntake(INTAKE_FORM_ID, answers);

      if (intakeRes.success) {
        toast.success(t('success'));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(t('error'));
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isPending) return;
    if (newOpen && !open) {
      setStep(1);
      form.reset();
    }
    setOpen(newOpen);
  };

  const progressPercent = step === 1 ? 0 : ((step - 1) / (INTAKE_TOTAL_STEPS - 1)) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="shadow-lg hover:shadow-xl transition-all">
          {triggerText || t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[90vh] sm:h-auto max-h-[90vh] gap-0 p-0 flex flex-col overflow-hidden border-border/40 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 bg-muted/20">
          <DialogTitle className="text-xl font-bold tracking-tight">{t('title')}</DialogTitle>
          <DialogDescription className="text-balance pt-2 leading-relaxed">
            {step === 1
              ? t('description')
              : t('step', { current: step, total: INTAKE_TOTAL_STEPS })}
          </DialogDescription>

          <div className="mt-6">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <ConsentSection />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          {t('fields.nameLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('fields.namePlaceholder')}
                            className="h-12 text-lg px-4 bg-muted/10 border-border/60 focus:bg-background transition-colors"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-sm italic">
                          {t('fields.nameHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          {t('fields.ageLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t('fields.agePlaceholder')}
                            className="h-12 text-lg px-4 bg-muted/10 border-border/60 focus:bg-background transition-colors"
                            {...field}
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-sm italic">
                          {t('fields.ageHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField
                    control={form.control}
                    name="mainRequest"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          {t('fields.mainRequestLabel')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('fields.mainRequestPlaceholder')}
                            className="min-h-[160px] text-lg p-4 resize-none bg-muted/10 border-border/60 focus:bg-background transition-colors"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-sm italic">
                          {t('fields.mainRequestHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField
                    control={form.control}
                    name="requestChecklist"
                    render={() => (
                      <FormItem className="space-y-4">
                        <div className="space-y-2">
                          <FormLabel className="text-lg font-bold">
                            {t('fields.checklistLabel')}
                          </FormLabel>
                          <FormDescription className="text-sm text-balance">
                            {t('fields.checklistHelper')}
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {checklistOptions.map(item => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="requestChecklist"
                              render={({ field }) => {
                                const isChecked = field.value?.includes(item.id);
                                return (
                                  <FormItem
                                    key={item.id}
                                    className={`flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-4 transition-all hover:bg-accent/5 cursor-pointer ${isChecked ? 'bg-primary/5 border-primary/40 shadow-sm' : 'bg-card border-border/40'}`}
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={checked => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(value => value !== item.id)
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-medium cursor-pointer flex-1 py-1 select-none">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          {t('fields.commentLabel')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('fields.commentPlaceholder')}
                            className="min-h-[200px] text-lg p-4 resize-none bg-muted/10 border-border/60 focus:bg-background transition-colors"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-sm italic">
                          {t('fields.commentHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="p-6 bg-muted/30 border-t border-border/50 gap-3 sm:gap-0">
              <div className="flex w-full items-center justify-between">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={isPending}
                    className="px-8"
                  >
                    {t('prev')}
                  </Button>
                ) : (
                  <div />
                )}

                {step < INTAKE_TOTAL_STEPS ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={step === 1 && !isConsentChecked}
                    className="px-8"
                  >
                    {t('next')}
                  </Button>
                ) : (
                  <Button type="submit" disabled={isPending || !canSubmit} className="px-8">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('submit')}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
