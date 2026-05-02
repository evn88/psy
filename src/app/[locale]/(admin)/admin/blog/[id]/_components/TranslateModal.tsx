'use client';

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAiSkill } from '@/modules/ai/hooks/use-ai-skill';
import type {
  BlogArticleTranslationInput,
  BlogArticleTranslationResult
} from '@/modules/ai/skills/blog-article-translation.contract';

interface TranslateModalProps {
  open: boolean;
  onClose: () => void;
  existingLocales: string[];
  sourceTranslation: {
    locale: string;
    title: string;
    description: string;
    content: string;
  } | null;
  onTranslated: (
    locale: string,
    data: { title: string; description: string; content: string }
  ) => void;
}

const AVAILABLE_LOCALES = [
  { locale: 'en', label: 'English' },
  { locale: 'sr', label: 'Srpski (Сербский)' }
];

type TranslateStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Модальное окно массового AI-перевода статьи из редактора.
 *
 * @param props Данные о доступных локалях и callback применения перевода.
 * @returns Диалог выбора локалей для перевода.
 */
export const TranslateModal = ({
  open,
  onClose,
  existingLocales,
  sourceTranslation,
  onTranslated
}: TranslateModalProps) => {
  const tDialog = useTranslations('Admin.blog.editor.translateDialog');

  const getAvailableLocales = () =>
    AVAILABLE_LOCALES.filter(localeItem => !existingLocales.includes(localeItem.locale)).map(
      localeItem => localeItem.locale
    );

  const [selected, setSelected] = useState<string[]>(getAvailableLocales);
  const [statuses, setStatuses] = useState<Record<string, TranslateStatus>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const { run: runTranslationSkill } = useAiSkill<
    BlogArticleTranslationInput,
    BlogArticleTranslationResult
  >({
    skillId: 'blog-article-translation'
  });

  /**
   * Переключает выбранную локаль в списке перевода.
   *
   * @param locale Локаль для переключения.
   */
  const toggleLocale = (locale: string) => {
    setSelected(previousLocales =>
      previousLocales.includes(locale)
        ? previousLocales.filter(selectedLocale => selectedLocale !== locale)
        : [...previousLocales, locale]
    );
  };

  /**
   * Запускает AI-перевод по выбранным локалям и применяет результат в редактор.
   */
  const handleTranslate = async () => {
    if (selected.length === 0) {
      return;
    }

    if (
      !sourceTranslation ||
      !sourceTranslation.title.trim() ||
      !sourceTranslation.content.trim()
    ) {
      toast.error(tDialog('sourceRequired'));
      return;
    }

    setIsTranslating(true);
    const nextStatuses: Record<string, TranslateStatus> = {};

    for (const locale of selected) {
      setStatuses(previousStatuses => ({ ...previousStatuses, [locale]: 'loading' }));

      try {
        const data = await runTranslationSkill({
          input: {
            sourceLocale: sourceTranslation.locale,
            targetLocale: locale,
            title: sourceTranslation.title,
            description: sourceTranslation.description,
            content: sourceTranslation.content
          }
        });

        nextStatuses[locale] = 'success';
        setStatuses(previousStatuses => ({ ...previousStatuses, [locale]: 'success' }));
        onTranslated(locale, {
          title: data.title,
          description: data.description,
          content: data.content
        });
      } catch (error) {
        nextStatuses[locale] = 'error';
        setStatuses(previousStatuses => ({ ...previousStatuses, [locale]: 'error' }));
        toast.error(
          tDialog('errorSingle', {
            locale,
            message: error instanceof Error ? error.message : tDialog('unknownError')
          })
        );
      }
    }

    setIsTranslating(false);
    const allSuccess = selected.every(locale => nextStatuses[locale] === 'success');

    if (allSuccess) {
      toast.success(tDialog('allSuccess'));
    }
  };

  /**
   * Закрывает модальное окно после завершения перевода.
   */
  const handleClose = () => {
    if (!isTranslating) {
      setSelected(getAvailableLocales());
      setStatuses({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tDialog('title')}</DialogTitle>
          <DialogDescription>{tDialog('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {AVAILABLE_LOCALES.map(({ locale, label }) => {
            const status = statuses[locale];
            const hasTranslation = existingLocales.includes(locale);

            return (
              <div key={locale} className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  id={`locale-${locale}`}
                  checked={selected.includes(locale)}
                  onCheckedChange={() => toggleLocale(locale)}
                  disabled={isTranslating}
                />
                <Label htmlFor={`locale-${locale}`} className="flex-1 cursor-pointer">
                  <span>{label}</span>
                  {hasTranslation && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({tDialog('alreadyExists')})
                    </span>
                  )}
                </Label>
                <div className="flex h-5 w-5 items-center justify-center">
                  {status === 'loading' && (
                    <Loader2 className="size-4 animate-spin text-[#900A0B]" />
                  )}
                  {status === 'success' && <Check className="size-4 text-green-600" />}
                  {status === 'error' && <X className="size-4 text-red-600" />}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isTranslating}>
            {isTranslating ? tDialog('closePending') : tDialog('close')}
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={selected.length === 0 || isTranslating}
            className="bg-[#900A0B] text-white hover:bg-[#900A0B]/90"
          >
            {isTranslating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {tDialog('submitting')}
              </>
            ) : (
              tDialog('submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
