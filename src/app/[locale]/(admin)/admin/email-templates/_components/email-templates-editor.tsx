'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Eye, FilePenLine, Languages, LoaderCircle, Save, Send } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  EditableEmailTemplateKey,
  EmailTemplateAdminRecipient,
  EmailTemplateContent,
  EmailTemplateDefinition,
  EmailTemplateEditorValue
} from '@/modules/email-templates/types';
import type { AppLocale } from '@/i18n/config';

import {
  previewEmailTemplateAction,
  saveEmailTemplateOverrideAction,
  sendTestEmailTemplateAction,
  type EmailTemplateActionResult
} from '../actions';
import { EmailTemplateTranslateDialog } from './email-template-translate-dialog';

const EmailTemplateCodeEditor = dynamic(
  () => import('./email-template-code-editor').then(module => module.EmailTemplateCodeEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-[32rem] animate-pulse rounded-xl bg-muted/50" />
  }
);

const editorFormSchema = z.object({
  content: z.object({
    subject: z.string().trim().min(1),
    html: z.string().trim().min(1),
    css: z.string()
  })
});

type EditorFormValues = z.infer<typeof editorFormSchema>;

interface EmailTemplatesEditorProps {
  definitions: EmailTemplateDefinition[];
  initialLocale: AppLocale;
  initialValues: EmailTemplateEditorValue[];
  adminRecipients: EmailTemplateAdminRecipient[];
  initialAdminRecipientId?: string;
}

const localeLabels: Record<AppLocale, string> = {
  ru: 'Русский',
  en: 'English',
  sr: 'Srpski'
};

const categoryOrder: EmailTemplateDefinition['category'][] = [
  'account',
  'schedule',
  'content',
  'pillo',
  'finance',
  'admin'
];

const getActionErrorKey = (
  reason: Extract<EmailTemplateActionResult, { success: false }>['reason']
) => {
  return `errors.${reason}`;
};

/**
 * Универсальный HTML/CSS-редактор email-шаблонов с серверным предпросмотром.
 */
export const EmailTemplatesEditor = ({
  definitions,
  initialLocale,
  initialValues,
  adminRecipients,
  initialAdminRecipientId
}: EmailTemplatesEditorProps) => {
  const t = useTranslations('Admin.emailTemplates');
  const [template, setTemplate] = useState<EditableEmailTemplateKey>('WELCOME_GOOGLE');
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const [values, setValues] = useState(initialValues);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState(initialAdminRecipientId ?? '');
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [translateSource, setTranslateSource] = useState<EmailTemplateContent>({
    subject: '',
    html: '',
    css: ''
  });
  const [pendingAction, setPendingAction] = useState<'save' | 'preview' | 'test' | null>(null);
  const [isPending, startTransition] = useTransition();

  const definition = definitions.find(item => item.key === template) ?? definitions[0];
  const activeValue = values.find(item => item.template === template && item.locale === locale);
  const russianValue = values.find(item => item.template === template && item.locale === 'ru');
  const form = useForm<EditorFormValues>({
    resolver: zodResolver(editorFormSchema),
    defaultValues: { content: activeValue?.content ?? {} }
  });

  useEffect(() => {
    form.reset({ content: activeValue?.content ?? {} });
  }, [activeValue, form, locale, template]);

  if (!definition || !activeValue) {
    return null;
  }

  const updateSavedValue = (content: EmailTemplateContent) => {
    setValues(current =>
      current.map(item =>
        item.template === template && item.locale === locale
          ? { ...item, content, isOverridden: true, isDirty: false }
          : item
      )
    );
  };

  const stashCurrentDraft = () => {
    if (!form.formState.isDirty) return;
    const content = form.getValues().content;

    setValues(current =>
      current.map(item =>
        item.template === template && item.locale === locale
          ? { ...item, content, isDirty: true }
          : item
      )
    );
  };

  const handleOpenTranslation = () => {
    setTranslateSource(
      locale === 'ru'
        ? form.getValues().content
        : (russianValue?.content ?? { subject: '', html: '', css: '' })
    );
    setIsTranslateOpen(true);
  };

  const handleTranslated = (
    translations: Array<{ locale: 'en' | 'sr'; content: EmailTemplateContent }>
  ) => {
    setValues(current =>
      current.map(item => {
        const translation = translations.find(
          translated => translated.locale === item.locale && item.template === template
        );

        return translation ? { ...item, content: translation.content, isDirty: true } : item;
      })
    );
    setPreviewHtml(null);
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`{${token}}`);
      toast.success(t('tokenCopied', { token: `{${token}}` }));
    } catch {
      toast.error(t('tokenCopyFailed'));
    }
  };

  const handleResult = (result: EmailTemplateActionResult, mode: 'preview' | 'save') => {
    if (!result.success) {
      toast.error(t(getActionErrorKey(result.reason)));
      return;
    }

    if (mode === 'preview' && result.html) {
      setPreviewHtml(result.html);
      return;
    }

    if (mode === 'save' && result.content) {
      updateSavedValue(result.content);
      toast.success(t('saved'));
    }
  };

  const handleSave = (formValues: EditorFormValues) => {
    setPendingAction('save');
    startTransition(async () => {
      try {
        const result = await saveEmailTemplateOverrideAction({
          template,
          locale,
          content: formValues.content
        });
        handleResult(result, 'save');
      } catch {
        toast.error(t('errors.SAVE_FAILED'));
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    setPendingAction('preview');
    startTransition(async () => {
      try {
        const result = await previewEmailTemplateAction({
          template,
          locale,
          content: form.getValues().content
        });
        handleResult(result, 'preview');
      } catch {
        toast.error(t('errors.PREVIEW_FAILED'));
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleTestSend = async () => {
    const isValid = await form.trigger();
    if (!isValid || !recipientId) return;

    setPendingAction('test');
    startTransition(async () => {
      try {
        const result = await sendTestEmailTemplateAction({
          template,
          locale,
          recipientId,
          content: form.getValues().content
        });

        if (!result.success) {
          toast.error(t(getActionErrorKey(result.reason)));
          return;
        }

        const recipient = adminRecipients.find(admin => admin.id === result.recipientId);
        toast.success(t('testSendSuccess', { recipient: recipient?.email ?? '' }));
      } catch {
        toast.error(t('errors.TEST_SEND_FAILED'));
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[92rem] space-y-6 pb-12">
      <header className="max-w-3xl space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <FilePenLine className="size-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t('eyebrow')}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('description')}</p>
      </header>

      <form
        onSubmit={form.handleSubmit(handleSave)}
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        <div className="grid gap-5 border-b bg-muted/25 p-4 sm:p-5 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-end">
          <div className="grid gap-4 sm:grid-cols-[minmax(16rem,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="email-template">{t('templateLabel')}</Label>
              <Select
                value={template}
                onValueChange={value => {
                  const nextTemplate = definitions.find(item => item.key === value)?.key;
                  if (nextTemplate) {
                    stashCurrentDraft();
                    setPreviewHtml(null);
                    setTemplate(nextTemplate);
                  }
                }}
              >
                <SelectTrigger id="email-template" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[24rem]">
                  {categoryOrder.map(category => {
                    const categoryDefinitions = definitions.filter(
                      item => item.category === category
                    );

                    return (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs text-muted-foreground">
                          {t(`categories.${category}`)}
                        </SelectLabel>
                        {categoryDefinitions.map(item => (
                          <SelectItem key={item.key} value={item.key}>
                            {t(`templates.${item.key}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="block">{t('languageLabel')}</Label>
              <div
                className="inline-flex min-h-11 flex-wrap items-center gap-1 rounded-lg border bg-background p-1"
                role="group"
                aria-label={t('languageLabel')}
              >
                {(Object.keys(localeLabels) as AppLocale[]).map(item => (
                  <Button
                    key={item}
                    type="button"
                    variant={locale === item ? 'secondary' : 'ghost'}
                    size="sm"
                    className="min-h-9"
                    onClick={() => {
                      stashCurrentDraft();
                      setPreviewHtml(null);
                      setLocale(item);
                    }}
                  >
                    {localeLabels[item]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="min-h-11 justify-self-start lg:justify-self-end"
            onClick={handleOpenTranslation}
          >
            <Languages className="size-4" aria-hidden />
            {t('translateFromRussian')}
          </Button>
        </div>

        <div className="grid items-start xl:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
          <section className="min-w-0 p-4 sm:p-6 lg:p-7">
            <div className="space-y-7">
              <div className="space-y-2">
                <Label htmlFor={`${template}-${locale}-subject`}>{t('fields.subject')}</Label>
                <Input
                  id={`${template}-${locale}-subject`}
                  className="h-11 font-mono text-sm"
                  {...form.register('content.subject')}
                />
              </div>

              <Tabs defaultValue="html" className="space-y-4">
                <TabsList className="grid h-11 w-full grid-cols-2 sm:w-72">
                  <TabsTrigger value="html">{t('htmlTab')}</TabsTrigger>
                  <TabsTrigger value="css">{t('cssTab')}</TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">{t('htmlTitle')}</h2>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                        {t('htmlHint')}
                      </p>
                    </div>
                    {(form.formState.isDirty || activeValue.isDirty) && (
                      <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span className="size-2 rounded-full bg-primary" aria-hidden />
                        {t('unsavedChanges')}
                      </span>
                    )}
                  </div>
                  <Controller
                    control={form.control}
                    name="content.html"
                    render={({ field }) => (
                      <EmailTemplateCodeEditor
                        language="html"
                        label={t('htmlTitle')}
                        value={field.value}
                        minHeight="34rem"
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </TabsContent>

                <TabsContent value="css" className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">{t('cssTitle')}</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                      {t('cssHint')}
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="content.css"
                    render={({ field }) => (
                      <EmailTemplateCodeEditor
                        language="css"
                        label={t('cssTitle')}
                        value={field.value}
                        minHeight="28rem"
                        placeholder={t('cssPlaceholder')}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="border-t pt-6">
                <h2 className="text-sm font-semibold">{t('tokensTitle')}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t('tokensDescription')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {definition.tokens.map(token => (
                    <Button
                      key={token.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-9 gap-2 py-1.5 font-mono text-xs"
                      title={t('tokenExample', { example: token.example })}
                      onClick={() => handleCopyToken(token.key)}
                    >
                      <Copy className="size-3" aria-hidden />
                      {`{${token.key}}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="min-w-0 border-t bg-muted/10 xl:sticky xl:top-4 xl:border-l xl:border-t-0">
            <div className="border-b px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{t('previewTitle')}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t('previewDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handlePreview}
                >
                  {pendingAction === 'preview' ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                  {t('previewShort')}
                </Button>
              </div>
            </div>
            {previewHtml ? (
              <iframe
                title={t('previewTitle')}
                sandbox=""
                srcDoc={previewHtml}
                className="min-h-[720px] w-full bg-white"
              />
            ) : (
              <div className="flex min-h-[520px] items-center justify-center px-8 text-center text-sm leading-6 text-muted-foreground">
                {t('previewEmpty')}
              </div>
            )}
          </aside>
        </div>

        <div className="flex flex-col gap-4 border-t bg-muted/25 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="min-h-11" disabled={isPending}>
              {pendingAction === 'save' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {t('save')}
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(16rem,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="test-email-recipient">{t('testRecipientLabel')}</Label>
              <Select value={recipientId} onValueChange={setRecipientId} disabled={isPending}>
                <SelectTrigger id="test-email-recipient" className="h-11 min-w-0 sm:w-72">
                  <SelectValue placeholder={t('testRecipientPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {adminRecipients.map(admin => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name ? `${admin.name} · ${admin.email}` : admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={isPending || !recipientId || adminRecipients.length === 0}
              onClick={handleTestSend}
            >
              {pendingAction === 'test' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {pendingAction === 'test' ? t('testSending') : t('testSend')}
            </Button>
          </div>
        </div>
      </form>

      <EmailTemplateTranslateDialog
        open={isTranslateOpen}
        template={template}
        sourceContent={translateSource}
        replacesCustomTranslations={values.some(
          item =>
            item.template === template &&
            item.locale !== 'ru' &&
            (item.isOverridden || item.isDirty)
        )}
        onOpenChange={setIsTranslateOpen}
        onTranslated={handleTranslated}
      />
    </div>
  );
};
