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
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { updateSettings } from '../actions';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const formSchema = z.object({
  language: z.string(),
  theme: z.string()
});

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

interface SettingsFormProps {
  initialSettings: {
    language: string;
    theme: string;
  };
}

/**
 * Форма настроек: язык и тема.
 * При сохранении языка немедленно обновляет cookie NEXT_LOCALE
 * для применения смены языка без задержки.
 */
export const SettingsForm = ({ initialSettings }: SettingsFormProps) => {
  const t = useTranslations('Settings');
  const { setTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSettings
  });

  // Синхронизация темы из БД при монтировании
  useEffect(() => {
    if (initialSettings.theme) {
      setTheme(initialSettings.theme);
    }
  }, [initialSettings.theme, setTheme]);

  /**
   * Обработчик сохранения настроек.
   * Немедленно применяет тему и locale через cookie, затем сохраняет в БД.
   * @param values - значения формы (language, theme)
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    // Немедленно применяем тему
    setTheme(values.theme);

    // Немедленно применяем locale через cookie (до router.refresh)
    setLocaleCookie(values.language);

    const result = await updateSettings(values);
    setLoading(false);

    if (result.success) {
      // Обновляем страницу — новый locale подхватится из cookie
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('appearanceTitle')}</CardTitle>
            <CardDescription>{t('appearanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      <SelectItem value="ru">{t('langRu')}</SelectItem>
                      <SelectItem value="en">{t('langEn')}</SelectItem>
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
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};
