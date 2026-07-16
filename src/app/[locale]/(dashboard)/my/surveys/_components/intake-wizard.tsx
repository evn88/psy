'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { ConsentSection } from '@/components/consent-section';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { IntakeFormDefinition } from '@/modules/intake/form-definition.server';
import type { IntakeQuestion } from '@/modules/intake/form-definition';
import { submitIntake } from '../_actions/intake.actions';

type IntakeValues = Record<string, unknown> & { consent: boolean };

interface IntakeWizardModalProps {
  definition: IntakeFormDefinition;
  locale: string;
  triggerText?: string;
}

const getDefaultValues = (definition: IntakeFormDefinition): IntakeValues => {
  const answers = Object.fromEntries(
    definition.steps.flatMap(step =>
      step.questions.map(question => [question.id, question.type === 'MULTI_CHOICE' ? [] : ''])
    )
  );

  return { ...answers, consent: false };
};

const isAnswerValid = (question: IntakeQuestion, value: unknown) => {
  if (!question.required) return true;

  if (question.type === 'MULTI_CHOICE') {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === 'NUMBER') {
    return typeof value === 'number' && Number.isFinite(value);
  }

  return typeof value === 'string' && value.trim().length > 0;
};

/** Мастер, который рендерит опубликованную администратором структуру первичной анкеты. */
export const IntakeWizardModal = ({ definition, locale, triggerText }: IntakeWizardModalProps) => {
  const t = useTranslations('IntakeWizard');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const form = useForm<IntakeValues>({
    defaultValues: getDefaultValues(definition),
    mode: 'onChange'
  });

  const totalSteps = definition.steps.length + 1;
  const isConsentStep = stepIndex === 0;
  const currentStep = isConsentStep ? null : definition.steps[stepIndex - 1];
  const progress = stepIndex === 0 ? 0 : (stepIndex / (totalSteps - 1)) * 100;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    if (nextOpen && !open) {
      setStepIndex(0);
      form.reset(getDefaultValues(definition));
    }
    setOpen(nextOpen);
  };

  const handleNext = async () => {
    const fieldNames = isConsentStep
      ? ['consent']
      : (currentStep?.questions
          .filter(question => question.required)
          .map(question => question.id) ?? []);
    const isValid = await form.trigger(fieldNames);
    if (isValid) setStepIndex(current => Math.min(current + 1, totalSteps - 1));
  };

  const handleSubmit = (values: IntakeValues) => {
    startTransition(async () => {
      const { consent: _consent, ...answers } = values;
      const result = await submitIntake(locale, answers);
      if (!result.success) {
        toast.error(t('error'));
        return;
      }

      toast.success(t('success'));
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-xl font-semibold shadow-md" variant="default">
          {triggerText ?? t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[90vh] max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/40 bg-background p-0 shadow-2xl sm:h-auto sm:max-w-[720px]">
        <DialogHeader className="shrink-0 border-b border-border/40 bg-gradient-to-br from-primary/5 via-card to-card p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">{t('title')}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {isConsentStep
                  ? t('description')
                  : t('step', { current: stepIndex + 1, total: totalSteps })}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-1 bg-muted/60" />
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {isConsentStep ? (
                <ConsentSection />
              ) : (
                currentStep && <StepFields step={currentStep} form={form} />
              )}
            </div>
            <DialogFooter className="shrink-0 border-t border-border/40 bg-muted/20 p-4">
              <div className="flex w-full items-center justify-between">
                {stepIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl"
                    disabled={isPending}
                    onClick={() => setStepIndex(current => current - 1)}
                  >
                    <ArrowLeft className="mr-1.5 size-4" />
                    {t('prev')}
                  </Button>
                ) : (
                  <span />
                )}
                {stepIndex < totalSteps - 1 ? (
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={isPending}
                    onClick={handleNext}
                  >
                    {t('next')}
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="rounded-xl" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="mr-2 size-4" />
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
};

const StepFields = ({
  step,
  form
}: {
  step: IntakeFormDefinition['steps'][number];
  form: ReturnType<typeof useForm<IntakeValues>>;
}) => (
  <div className="space-y-6 animate-in fade-in duration-200">
    <div className="space-y-1">
      <h3 className="text-lg font-bold">{step.title}</h3>
      {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
    </div>
    {step.questions.map(question => (
      <QuestionField key={question.id} question={question} form={form} />
    ))}
  </div>
);

const QuestionField = ({
  question,
  form
}: {
  question: IntakeQuestion;
  form: ReturnType<typeof useForm<IntakeValues>>;
}) => (
  <Controller
    control={form.control}
    name={question.id}
    rules={{ validate: value => isAnswerValid(question, value) || 'Ответьте на вопрос' }}
    render={({ field, fieldState }) => (
      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground/90">
          {question.label}
          {question.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {question.type === 'LONG_TEXT' && (
          <Textarea
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={field.onChange}
            className="min-h-40 rounded-xl"
          />
        )}
        {question.type === 'SHORT_TEXT' && (
          <Input
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={field.onChange}
            className="h-12 rounded-xl"
          />
        )}
        {question.type === 'NUMBER' && (
          <Input
            type="number"
            value={typeof field.value === 'number' ? field.value : ''}
            onChange={event =>
              field.onChange(event.target.value === '' ? '' : Number(event.target.value))
            }
            className="h-12 rounded-xl"
          />
        )}
        {question.type === 'SINGLE_CHOICE' && (
          <RadioGroup
            value={typeof field.value === 'string' ? field.value : ''}
            onValueChange={field.onChange}
            className="gap-2"
          >
            {question.options.map(option => (
              <div key={option.id} className="flex items-center gap-3 rounded-xl border p-3">
                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                <Label
                  htmlFor={`${question.id}-${option.id}`}
                  className="cursor-pointer font-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
        {question.type === 'MULTI_CHOICE' && (
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map(option => {
              const selected = Array.isArray(field.value) && field.value.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3',
                    selected && 'border-primary bg-primary/5'
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={checked =>
                      field.onChange(
                        checked
                          ? [...(Array.isArray(field.value) ? field.value : []), option.id]
                          : Array.isArray(field.value)
                            ? field.value.filter(value => value !== option.id)
                            : []
                      )
                    }
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
        {question.helperText && (
          <p className="text-xs italic text-muted-foreground">{question.helperText}</p>
        )}
        {fieldState.error && (
          <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
        )}
      </div>
    )}
  />
);
