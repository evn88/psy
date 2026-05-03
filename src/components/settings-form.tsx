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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCallback, useEffect, useState } from 'react';
import { updateSettings } from '@/lib/settings-actions';
import { useLocale, useTranslations } from 'next-intl';
import { type Theme, useTheme } from '@/components/theme-provider';
import { locales, type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { getPathname, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

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

const formSchema = z.object({
  language: z.string(),
  theme: z.string()
});

/**
 * Нормализует значение языка до поддерживаемой locale приложения.
 * @param locale - произвольное значение языка.
 * @returns Поддерживаемая locale.
 */
const normalizeLocale = (locale: string): AppLocale => {
  return isLocale(locale) ? locale : defaultLocale;
};

/**
 * Нормализует строковое значение темы к поддерживаемому union-типу.
 * @param theme - произвольное значение темы.
 * @returns Поддерживаемая тема интерфейса.
 */
const normalizeTheme = (theme: string): Theme => {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }

  return 'system';
};

/**
 * Устанавливает cookie NEXT_LOCALE для немедленной смены языка.
 * Вынесена вне компонента для соблюдения правил React Compiler.
 * @param locale - код языка ('en' | 'ru')
 */
const setLocaleCookie = (locale: string): void => {
  if (typeof document !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

/**
 * Выполняет полную навигацию документа при смене locale.
 * Это позволяет получить серверно-обновлённые locale-aware metadata и layout.
 * @param pathname - текущий pathname без locale-префикса.
 * @param locale - целевая locale.
 */
const navigateToLocaleDocument = (pathname: string, locale: AppLocale): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const targetPathname = getPathname({
    href: pathname,
    locale
  });

  window.location.assign(targetPathname);
};

interface SettingsFormProps {
  initialSettings: {
    language: string;
    theme: string;
  };
  hideSubmitButton?: boolean;
  onStateChange?: (state: {
    isDirty: boolean;
    isPending: boolean;
    submit: () => Promise<void>;
  }) => void;
  variant?: 'card' | 'ghost';
}

/**
 * Форма настроек: язык и тема.
 * Реализовано в премиальном стиле с визуальными переключателями темы.
 */
export const SettingsForm = ({
  initialSettings,
  hideSubmitButton = false,
  onStateChange,
  variant = 'card'
}: SettingsFormProps) => {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const { setTheme, theme: currentTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSettings
  });

  useEffect(() => {
    form.reset(initialSettings);
  }, [form, initialSettings]);

  // Синхронизация темы из БД при монтировании (с проверкой во избежание циклов)
  useEffect(() => {
    if (initialSettings.theme) {
      const targetTheme = normalizeTheme(initialSettings.theme);
      if (targetTheme !== currentTheme) {
        setTheme(targetTheme);
      }
    }
  }, [initialSettings.theme, setTheme, currentTheme]);

  /**
   * Обработчик сохранения настроек.
   * Немедленно применяет тему и locale через cookie, затем сохраняет в БД.
   * @param values - значения формы (language, theme)
   */
  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      setLoading(true);
      const nextLocale = normalizeLocale(values.language);

      // Немедленно применяем тему
      setTheme(normalizeTheme(values.theme));

      // Немедленно применяем locale через cookie (до router.refresh)
      setLocaleCookie(nextLocale);

      const result = await updateSettings(values);
      setLoading(false);

      if (result.success) {
        if (nextLocale !== normalizeLocale(locale)) {
          navigateToLocaleDocument(pathname, nextLocale);
          return;
        }

        router.refresh();
      } else {
        console.error(result.error);
      }
    },
    [locale, pathname, router, setTheme]
  );

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (!onStateChange) {
      return;
    }

    onStateChange({
      isDirty,
      isPending: loading,
      submit: async () => {
        await form.handleSubmit(onSubmit)();
      }
    });
  }, [isDirty, loading, onStateChange, onSubmit, form]);

  const formContent = (
    <div className="space-y-6">
      {/* Выбор Языка */}
      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem className="space-y-4 px-4 py-2">
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
            <FormDescription className="text-[13px] text-muted-foreground/60">
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
          <FormItem className="space-y-4 px-4 py-2">
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
                    <FormLabel className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.25rem] border-[1.5rem] border-transparent bg-black/[0.03] p-4 text-center ring-1 ring-black/[0.05] transition-all hover:bg-black/[0.05] peer-data-[state=checked]:bg-white peer-data-[state=checked]:shadow-[0_4px_12px_rgba(0,0,0,0.08)] peer-data-[state=checked]:ring-primary/40 dark:bg-white/[0.03] dark:ring-white/[0.05] dark:hover:bg-white/[0.05] dark:peer-data-[state=checked]:bg-white/10 dark:peer-data-[state=checked]:ring-white/20">
                      <item.icon className={cn('h-6 w-6 transition-transform', item.color)} />
                      <span className="text-[12px] font-bold tracking-tight text-foreground/70">
                        {t(item.label)}
                      </span>
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormDescription className="text-[13px] text-muted-foreground/60">
              {t('themeDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {!hideSubmitButton && (
        <div className="pt-2">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold tracking-tight">
                {t('appearanceTitle')}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground/60">
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
