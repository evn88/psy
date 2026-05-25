'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale } from 'next-intl';
import { type Theme, useTheme } from '@/components/theme-provider';
import { defaultLocale, type AppLocale, isLocale } from '@/i18n/config';
import { getPathname, usePathname, useRouter } from '@/i18n/navigation';
import { updateSettings } from '@/lib/settings-actions';

export const settingsFormSchema = z.object({
  language: z.string(),
  theme: z.string()
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

/**
 * Нормализует значение языка до поддерживаемой locale приложения.
 * @param locale - произвольное значение языка.
 * @returns Поддерживаемая locale.
 */
export const normalizeLocale = (locale: string): AppLocale => {
  return isLocale(locale) ? locale : defaultLocale;
};

/**
 * Нормализует строковое значение темы к поддерживаемому union-типу.
 * @param theme - произвольное значение темы.
 * @returns Поддерживаемая тема интерфейса.
 */
export const normalizeTheme = (theme: string): Theme => {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'system';
};

/**
 * Устанавливает cookie NEXT_LOCALE для немедленной смены языка.
 * @param locale - код языка ('en' | 'ru')
 */
export const setLocaleCookie = (locale: string): void => {
  if (typeof document !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

/**
 * Выполняет полную навигацию документа при смене locale.
 * @param pathname - текущий pathname без locale-префикса.
 * @param locale - целевая locale.
 */
export const navigateToLocaleDocument = (pathname: string, locale: AppLocale): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const targetPathname = getPathname({
    href: pathname,
    locale
  });

  window.location.assign(targetPathname);
};

interface UseSettingsFormParams {
  initialSettings: SettingsFormValues;
  onStateChange?: (state: {
    isDirty: boolean;
    isPending: boolean;
    submit: () => Promise<void>;
  }) => void;
}

interface UseSettingsFormReturn {
  form: UseFormReturn<SettingsFormValues>;
  loading: boolean;
  isDirty: boolean;
  onSubmit: (values: SettingsFormValues) => Promise<void>;
}

/**
 * Единый кастомный хук для управления бизнес-логикой настроек внешнего вида и языка.
 */
export const useSettingsForm = ({
  initialSettings,
  onStateChange
}: UseSettingsFormParams): UseSettingsFormReturn => {
  const locale = useLocale();
  const { setTheme, theme: currentTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: initialSettings
  });

  useEffect(() => {
    form.reset(initialSettings);
  }, [form, initialSettings]);

  // Синхронизация темы из БД при монтировании
  useEffect(() => {
    if (initialSettings.theme) {
      const targetTheme = normalizeTheme(initialSettings.theme);
      if (targetTheme !== currentTheme) {
        setTheme(targetTheme);
      }
    }
  }, [initialSettings.theme, setTheme, currentTheme]);

  const onSubmit = useCallback(
    async (values: SettingsFormValues) => {
      setLoading(true);
      const nextLocale = normalizeLocale(values.language);

      // Немедленно применяем тему
      setTheme(normalizeTheme(values.theme));

      // Немедленно применяем locale через cookie
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

  return {
    form,
    loading,
    isDirty,
    onSubmit
  };
};
