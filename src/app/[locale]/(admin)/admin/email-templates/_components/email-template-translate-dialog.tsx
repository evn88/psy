'use client';

import { Check, Languages, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAiSkill } from '@/modules/ai/hooks/use-ai-skill';
import type {
  EmailTemplateTranslationInput,
  EmailTemplateTranslationResult
} from '@/modules/ai/skills/email-template-translation.contract';
import type {
  EditableEmailTemplateKey,
  EmailTemplateContent
} from '@/modules/email-templates/types';

interface EmailTemplateTranslateDialogProps {
  open: boolean;
  template: EditableEmailTemplateKey;
  sourceContent: EmailTemplateContent;
  replacesCustomTranslations: boolean;
  onOpenChange: (open: boolean) => void;
  onTranslated: (translations: EmailTemplateTranslationResult['translations']) => void;
}

/** Переводит русский вариант email-шаблона на все поддерживаемые языки. */
export const EmailTemplateTranslateDialog = ({
  open,
  template,
  sourceContent,
  replacesCustomTranslations,
  onOpenChange,
  onTranslated
}: EmailTemplateTranslateDialogProps) => {
  const t = useTranslations('Admin.emailTemplates.translateDialog');
  const { run, isPending } = useAiSkill<
    EmailTemplateTranslationInput,
    EmailTemplateTranslationResult
  >({ skillId: 'email-template-translation' });

  const handleTranslate = async () => {
    try {
      const result = await run({
        input: {
          template,
          sourceLocale: 'ru',
          targetLocales: ['en', 'sr'],
          content: sourceContent
        }
      });

      onTranslated(result.translations);
      toast.success(t('success'));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={nextOpen => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {['English', 'Srpski'].map(language => (
            <div key={language} className="flex items-center gap-3 border-b py-3 last:border-b-0">
              <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-4 text-muted-foreground" aria-hidden />
                )}
              </span>
              <span className="text-sm font-medium">{language}</span>
            </div>
          ))}
          {replacesCustomTranslations ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm leading-5 text-muted-foreground">
              {t('overwriteWarning')}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button onClick={handleTranslate} disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Languages className="size-4" aria-hidden />
            )}
            {isPending ? t('pending') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
