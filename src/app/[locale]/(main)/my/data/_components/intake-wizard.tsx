'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

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

const TOTAL_STEPS = 4;

export function IntakeWizardModal({ triggerText }: { triggerText?: string }) {
  const t = useTranslations('IntakeWizard');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [canSubmit, setCanSubmit] = useState(false);

  React.useEffect(() => {
    if (step === TOTAL_STEPS) {
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
    { id: 'stuck', label: t('checklist.stuck') },
    { id: 'panic', label: t('checklist.panic') },
    { id: 'adhd_traits', label: t('checklist.adhd_traits') },
    { id: 'procrastination', label: t('checklist.procrastination') },
    { id: 'ed', label: t('checklist.ed') },
    { id: 'relationships', label: t('checklist.relationships') }
  ];

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ['consent'];
    if (step === 2) fieldsToValidate = ['name', 'age'];
    if (step === 3) fieldsToValidate = ['mainRequest'];

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
      // Remove focus to prevent keyup events from triggering the next button accidentally
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = (data: FormValues) => {
    // If the user hit 'Enter' in a text field before the last step, act as 'Next'
    if (step !== TOTAL_STEPS) {
      handleNext();
      return;
    }

    startTransition(async () => {
      // Записываем согласие
      const consentRes = await recordConsent('INTAKE_SUBMIT');
      if (!consentRes.success) {
        toast.error(t('error'));
        return;
      }

      // Убираем согласие, оставляем только ответы
      const { consent, ...answers } = data;
      const intakeRes = await submitIntake('intake_v1', answers);

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

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">{triggerText || t('trigger')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {step === 1 ? t('description') : t('step', { current: step, total: TOTAL_STEPS })}
          </DialogDescription>

          {/* Кастомный Progress bar */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-4">
            <div
              className="bg-primary h-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm text-muted-foreground">
                  <p>Перед началом просим ознакомиться с нашими юридическими документами:</p>
                  <ul className="list-disc list-inside space-y-1 my-2">
                    <li>
                      <a
                        href="/documents/personal-data-consent.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Политика обработки персональных данных
                      </a>
                    </li>
                    <li>
                      <a
                        href="/documents/user-agreement.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Пользовательское соглашение
                      </a>
                    </li>
                  </ul>
                  <p>
                    Все ваши ответы защищены сквозным (AES-GCM) шифрованием и недоступны третьим
                    лицам.
                  </p>
                  <p>Нажимая галочку и продолжая, вы создаете цифровую подпись своего согласия.</p>
                </div>

                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          Согласие на обработку данных
                        </FormLabel>
                        <FormDescription>{t('fields.consentLabel')}</FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.nameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('fields.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.ageLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={t('fields.agePlaceholder')}
                          {...field}
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                  control={form.control}
                  name="mainRequest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.mainRequestLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('fields.mainRequestPlaceholder')}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                  control={form.control}
                  name="requestChecklist"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">{t('fields.checklistLabel')}</FormLabel>
                        <FormDescription>{t('fields.checklistDesc')}</FormDescription>
                      </div>
                      {checklistOptions.map(item => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="requestChecklist"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={checked => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(
                                            field.value?.filter(value => value !== item.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem className="pt-4">
                      <FormLabel>{t('fields.commentLabel')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('fields.commentPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2 gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={isPending}
                  className="sm:mr-auto"
                >
                  {t('prev')}
                </Button>
              )}

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 && !isConsentChecked}
                  className={step === 1 ? 'w-full sm:w-auto sm:ml-auto' : 'w-full sm:w-auto'}
                >
                  {t('next')}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending || !canSubmit}
                  className="w-full sm:w-auto"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('submit')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
