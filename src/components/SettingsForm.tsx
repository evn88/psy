'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { updateSettings } from '@/lib/settings-actions';
import { useLocale, useTranslations } from 'next-intl';
import { type Theme, useTheme } from '@/components/ThemeProvider';
import { locales, type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { getPathname, usePathname, useRouter } from '@/i18n/navigation';

/** Маппинг локалей на i18n ключи для отображения названий языков */
const LOCALE_I18N_KEYS: Record<AppLocale, string> = {
  ru: 'langRu',
  en: 'langEn',
  sr: 'langSr'
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
  variant?: 'card' | 'ghost';
}

/**
 * Форма настроек: язык и тема.
 * При сохранении языка немедленно обновляет cookie NEXT_LOCALE
 * для применения смены языка без задержки.
 */
export const SettingsForm = ({ initialSettings, variant = 'card' }: SettingsFormProps) => {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const { setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSettings
  });

  // Синхронизация темы из БД при монтировании
  useEffect(() => {
    if (initialSettings.theme) {
      setTheme(normalizeTheme(initialSettings.theme));
    }
  }, [initialSettings.theme, setTheme]);

  /**
   * Обработчик сохранения настроек.
   * Немедленно применяет тему и locale через cookie, затем сохраняет в БД.
   * @param values - значения формы (language, theme)
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
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
  };

  const formContent = (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('languageLabel')}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('languagePlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {locales.map(locale => (
                  <SelectItem key={locale} value={locale}>
                    {t(LOCALE_I18N_KEYS[locale])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>{t('languageDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="theme"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('themeLabel')}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('themePlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="light">{t('themeLight')}</SelectItem>
                <SelectItem value="dark">{t('themeDark')}</SelectItem>
                <SelectItem value="system">{t('themeSystem')}</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>{t('themeDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t('saving') : t('save')}
      </Button>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {variant === 'card' ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('appearanceTitle')}</CardTitle>
              <CardDescription>{t('appearanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent>{formContent}</CardContent>
          </Card>
        ) : (
          formContent
        )}
      </form>
    </Form>
  );
};
