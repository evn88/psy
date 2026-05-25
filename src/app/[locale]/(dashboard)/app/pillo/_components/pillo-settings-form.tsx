'use client';

import { Globe, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslations } from 'next-intl';
import { locales, type AppLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';
import { useSettingsForm, type SettingsFormValues } from '@/lib/hooks/use-settings-form';

/** Маппинг локалей на i18n ключи для отображения названий языков */
const LOCALE_I18N_KEYS: Record<AppLocale, string> = {
  ru: 'langRu',
  en: 'langEn',
  sr: 'langSr'
} as const;

/** Маппинг локалей на флаги/эмодзи */
const LOCALE_FLAGS: Record<AppLocale, string> = {
  ru: '🇷🇺',
  en: '🇺🇸',
  sr: '🇷🇸'
} as const;

interface PilloSettingsFormProps {
  initialSettings: SettingsFormValues;
  hideSubmitButton?: boolean;
  onStateChange?: (state: {
    isDirty: boolean;
    isPending: boolean;
    submit: () => Promise<void>;
  }) => void;
  variant?: 'card' | 'ghost';
}

/**
 * Специальная форма настроек внешнего вида и языка для мини-приложения Pillo.
 * Оформлена в стиле iOS 26 (матовое стекло, внутренние паддинги px-5 py-4 для карточек).
 */
export const PilloSettingsForm = ({
  initialSettings,
  hideSubmitButton = false,
  onStateChange,
  variant = 'card'
}: PilloSettingsFormProps) => {
  const t = useTranslations('Settings');

  const { form, loading, onSubmit } = useSettingsForm({
    initialSettings,
    onStateChange
  });

  const formContent = (
    <div className="space-y-6">
      {/* Выбор Языка */}
      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-blue-500 text-white shadow-sm ring-4 ring-white/10 dark:ring-white/5">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <FormLabel className="text-[16px] font-semibold tracking-tight text-foreground/90">
                {t('languageLabel')}
              </FormLabel>
            </div>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="h-12 rounded-2xl border-none bg-black/[0.03] px-4 text-[16px] font-medium ring-1 ring-black/[0.05] transition-all hover:bg-black/[0.05] dark:bg-white/[0.03] dark:ring-white/[0.05] dark:hover:bg-white/[0.05]">
                  <SelectValue placeholder={t('languagePlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-2xl border-white/40 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/80">
                {locales.map(loc => (
                  <SelectItem key={loc} value={loc} className="rounded-xl py-3 text-[15px]">
                    <span className="flex items-center gap-3">
                      <span className="text-lg leading-none">{LOCALE_FLAGS[loc]}</span>
                      {t(LOCALE_I18N_KEYS[loc])}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-[13px] text-muted-foreground/60 leading-relaxed">
              {t('languageDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="h-px bg-black/[0.04] dark:bg-white/[0.04]" />

      {/* Выбор Темы */}
      <FormField
        control={form.control}
        name="theme"
        render={({ field }) => (
          <FormItem className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-indigo-500 text-white shadow-sm ring-4 ring-white/10 dark:ring-white/5">
                <Palette className="h-4.5 w-4.5" />
              </div>
              <FormLabel className="text-[16px] font-semibold tracking-tight text-foreground/90">
                {t('themeLabel')}
              </FormLabel>
            </div>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { value: 'light', icon: Sun, label: 'themeLight', color: 'text-amber-500' },
                  { value: 'dark', icon: Moon, label: 'themeDark', color: 'text-blue-400' },
                  { value: 'system', icon: Monitor, label: 'themeSystem', color: 'text-slate-400' }
                ].map(item => (
                  <FormItem key={item.value}>
                    <FormControl>
                      <RadioGroupItem value={item.value} className="peer sr-only" />
                    </FormControl>
                    <FormLabel className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.25rem] border-2 border-transparent bg-black/[0.03] p-4 text-center ring-1 ring-black/[0.05] transition-all hover:bg-black/[0.05] peer-data-[state=checked]:bg-white peer-data-[state=checked]:shadow-[0_4px_12px_rgba(0,0,0,0.08)] peer-data-[state=checked]:ring-primary/40 dark:bg-white/[0.03] dark:ring-white/[0.05] dark:hover:bg-white/[0.05] dark:peer-data-[state=checked]:bg-white/10 dark:peer-data-[state=checked]:ring-white/20 shadow-sm">
                      <item.icon className={cn('h-6 w-6 transition-transform', item.color)} />
                      <span className="text-[12px] font-bold tracking-tight text-foreground/70">
                        {t(item.label)}
                      </span>
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormDescription className="text-[13px] text-muted-foreground/60 leading-relaxed">
              {t('themeDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {!hideSubmitButton && (
        <div className="pt-2 px-5 pb-4">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-primary font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {loading ? t('saving') : t('save')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {variant === 'card' ? (
          <Card className="overflow-hidden rounded-[2rem] border-white/40 bg-white/40 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-xl font-bold tracking-tight">
                {t('appearanceTitle')}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground/60 leading-relaxed">
                {t('appearanceDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">{formContent}</CardContent>
          </Card>
        ) : (
          formContent
        )}
      </form>
    </Form>
  );
};
