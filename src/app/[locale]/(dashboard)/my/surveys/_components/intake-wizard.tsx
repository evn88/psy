'use client';

import * as React from 'react';
import { useState, useTransition, useMemo, useRef, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ConsentSection } from '@/components/consent-section';

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
import { Loader2, ArrowLeft, ArrowRight, ClipboardCheck } from 'lucide-react';
import { recordConsent, submitIntake } from '../_actions/intake.actions';
import { Progress } from '@/components/ui/progress';
import { INTAKE_FORM_ID, INTAKE_TOTAL_STEPS } from '@/lib/config/intake';
import { cn } from '@/lib/utils';

/**
 * Статическая Zod-схема формы анкеты, вынесена на уровень модуля
 * чтобы избежать пересоздания при рендере и обеспечить строгую типизацию маппинга шагов.
 */
const intakeSchema = z.object({
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
});

type FormValues = z.infer<typeof intakeSchema>;

/**
 * Маппинг номера шага на поля формы, которые нужно валидировать перед переходом на следующий шаг.
 * Статическая константа, не зависит от состояния компонента.
 */
const STEP_FIELDS_MAP: Record<number, (keyof FormValues)[]> = {
  1: ['consent'],
  2: ['name', 'age'],
  3: ['mainRequest'],
  4: ['requestChecklist']
};

/**
 * Переработанное модальное окно с многошаговым мастером заполнения первичной анкеты (Intake).
 * Концепция "Safe Sanctuary": мягкие плитки выбора, премиальные инпуты, крупные кнопки, анимированный прогресс.
 */
export function IntakeWizardModal({ triggerText }: { triggerText?: string }) {
  const t = useTranslations('IntakeWizard');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  /**
   * Флаг разрешения отправки: становится true через 500ms после входа на последний шаг.
   * Используем ref + локальный стейт чтобы избежать setState внутри useEffect.
   */
  const [canSubmit, setCanSubmit] = useState(false);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(intakeSchema),
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

  const isConsentChecked = useWatch({
    control: form.control,
    name: 'consent'
  });

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

  const handleNext = useCallback(async () => {
    const fieldsToValidate: (keyof FormValues)[] = STEP_FIELDS_MAP[step] ?? [];

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) return;

    const nextStep = Math.min(step + 1, INTAKE_TOTAL_STEPS);
    setStep(nextStep);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Если переходим на последний шаг — разблокируем кнопку Submit через 500ms
    if (nextStep === INTAKE_TOTAL_STEPS) {
      setCanSubmit(false);
      if (submitTimerRef.current !== null) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => setCanSubmit(true), 500);
    }
  }, [form, step]);

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  /**
   * Обработчик отправки формы: проверяет шаг и либо переходит дальше, либо отправляет данные.
   */
  const onSubmit = useCallback(
    (data: FormValues) => {
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

        const { consent: _consent, ...answers } = data;
        const intakeRes = await submitIntake(INTAKE_FORM_ID, answers);

        if (intakeRes.success) {
          toast.success(t('success'));
          setOpen(false);
          router.refresh();
        } else {
          toast.error(t('error'));
        }
      });
    },
    [step, handleNext, t, router]
  );

  /**
   * Мемоизированный обработчик submit-события формы.
   * Вынесен из JSX, чтобы избежать обращения к ref во время рендера (react-hooks/refs).
   */
  const handleSubmitForm = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => form.handleSubmit(onSubmit)(event),
    [form, onSubmit]
  );

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
        <Button
          variant="default"
          className="h-11 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold"
        >
          {triggerText || t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px] h-[90vh] sm:h-auto max-h-[90vh] gap-0 p-0 flex flex-col overflow-hidden border-border/40 shadow-2xl rounded-2xl bg-background">
        {/* Header с красивым градиентным фоном и сдержанным прогресс-баром */}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0 bg-gradient-to-br from-primary/5 via-card to-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">{t('title')}</DialogTitle>
              <DialogDescription className="text-balance text-xs leading-relaxed text-muted-foreground mt-0.5">
                {step === 1
                  ? t('description')
                  : t('step', { current: step, total: INTAKE_TOTAL_STEPS })}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4">
            <Progress value={progressPercent} className="h-1 bg-muted/60" />
          </div>
        </DialogHeader>

        {/* Форма с контентом */}
        <Form {...form}>
          <form onSubmit={handleSubmitForm} className="contents">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Шаг 1: Согласие */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <ConsentSection />
                </div>
              )}

              {/* Шаг 2: Имя и Возраст */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-bold text-foreground/90">
                          {t('fields.nameLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('fields.namePlaceholder')}
                            className="h-12 rounded-xl text-base px-4 bg-muted/10 border-border/60 focus:bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 transition-all duration-200"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground/80 italic">
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
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-bold text-foreground/90">
                          {t('fields.ageLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t('fields.agePlaceholder')}
                            className="h-12 rounded-xl text-base px-4 bg-muted/10 border-border/60 focus:bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 transition-all duration-200"
                            {...field}
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground/80 italic">
                          {t('fields.ageHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Шаг 3: Главный запрос */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <FormField
                    control={form.control}
                    name="mainRequest"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-bold text-foreground/90">
                          {t('fields.mainRequestLabel')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('fields.mainRequestPlaceholder')}
                            className="min-h-[180px] rounded-xl text-base p-4 resize-none bg-muted/10 border-border/60 focus:bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 transition-all duration-200 leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground/80 italic">
                          {t('fields.mainRequestHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Шаг 4: Чеклист симптомов */}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <FormField
                    control={form.control}
                    name="requestChecklist"
                    render={() => (
                      <FormItem className="space-y-4">
                        <div className="space-y-1">
                          <FormLabel className="text-base font-bold text-foreground/90">
                            {t('fields.checklistLabel')}
                          </FormLabel>
                          <FormDescription className="text-xs text-muted-foreground/85">
                            {t('fields.checklistHelper')}
                          </FormDescription>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-[380px] overflow-y-auto pr-1">
                          {checklistOptions.map(item => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="requestChecklist"
                              render={({ field }) => {
                                const isChecked = field.value?.includes(item.id);
                                return (
                                  <label
                                    className={cn(
                                      'flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-250 cursor-pointer select-none group',
                                      isChecked
                                        ? 'bg-primary/5 border-primary/45 shadow-sm'
                                        : 'bg-card border-border/50 hover:border-primary/30 hover:bg-muted/30'
                                    )}
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={isChecked}
                                        className={cn(
                                          'mt-0.5 transition-colors duration-200',
                                          isChecked
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-muted-foreground/30'
                                        )}
                                        onCheckedChange={checked => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(value => value !== item.id)
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <span
                                      className={cn(
                                        'text-xs font-semibold leading-relaxed transition-colors duration-200',
                                        isChecked
                                          ? 'text-primary'
                                          : 'text-foreground/80 group-hover:text-foreground'
                                      )}
                                    >
                                      {item.label}
                                    </span>
                                  </label>
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

              {/* Шаг 5: Дополнительный комментарий */}
              {step === 5 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-bold text-foreground/90">
                          {t('fields.commentLabel')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('fields.commentPlaceholder')}
                            className="min-h-[220px] rounded-xl text-base p-4 resize-none bg-muted/10 border-border/60 focus:bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 transition-all duration-200 leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground/80 italic">
                          {t('fields.commentHelper')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 shrink-0 gap-2 sm:gap-0">
              <div className="flex w-full items-center justify-between">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={isPending}
                    className="h-10 rounded-xl px-6 font-semibold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
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
                    className="h-10 rounded-xl px-6 font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {t('next')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isPending || !canSubmit}
                    className="h-10 rounded-xl px-6 font-bold flex items-center gap-2 shadow-md bg-primary text-primary-foreground hover:bg-primary-dark transition-all duration-200"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
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
