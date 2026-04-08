'use client';

import { ShieldCheck, PenTool } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';

interface ConsentSectionProps {
  /**
   * Имя поля (name) в форме react-hook-form. По умолчанию 'consent'.
   */
  name?: string;
  /**
   * Пространство имен (namespace) для переводов. По умолчанию 'IntakeWizard'.
   * Позволяет переопределить тексты для специфичных сценариев.
   */
  translationNamespace?: string;
}

export function ConsentSection({
  name = 'consent',
  translationNamespace = 'IntakeWizard'
}: ConsentSectionProps) {
  const t = useTranslations(translationNamespace);
  const { control } = useFormContext();

  return (
    <div className="space-y-6">
      {/* Секция безопасности */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3>{t('fields.securityTitle')}</h3>
        </div>
        <div className="rounded-xl bg-muted/30 p-5 border border-border/50">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('fields.securityNotice')}
          </p>
        </div>
      </div>

      {/* Юридические документы */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t('legalNotice')}</p>
        <ul className="space-y-2">
          <li>
            <a
              href="/documents/personal-data-consent.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center"
            >
              {t('legalPolicy')}
            </a>
          </li>
          <li>
            <a
              href="/documents/user-agreement.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center"
            >
              {t('legalAgreement')}
            </a>
          </li>
        </ul>
      </div>

      {/* Согласие */}
      <div className="border-t border-border/50 pt-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <PenTool className="h-5 w-5 text-primary" />
          <h3>{t('fields.consentSectionTitle')}</h3>
        </div>

        <FormField
          control={control}
          name={name}
          render={({ field }) => (
            <FormItem className="space-y-4">
              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-5 shadow-sm bg-card/50 transition-colors hover:bg-accent/5">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1.5 leading-none">
                  <FormLabel className="text-sm font-medium cursor-pointer leading-relaxed block">
                    {t('fields.consentLabel')}
                  </FormLabel>
                </div>
              </div>
              <FormMessage />
              <FormDescription className="text-[11px] leading-relaxed text-muted-foreground px-1">
                {t('fields.digitalSignatureNote')}
              </FormDescription>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
