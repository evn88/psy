'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { TranslateModal } from '@/components/admin/blog/translate-modal';
import type { BlogCategory } from '@prisma/client';
import '@/styles/blog-article.css';

import { formSchema, type FormValues, type Translation } from './blog-editor.schema';
import { useArticleVersions } from './use-article-versions';
import { useBlogEditorSubmit } from './use-blog-editor-submit';

import { BlogEditorTopBar } from './blog-editor-top-bar';
import { BlogEditorMainContent } from './blog-editor-main-content';
import { BlogEditorSidebar } from './blog-editor-sidebar';

interface BlogEditorFormProps {
  postId: string;
  initialSlug: string;
  initialStatus: 'DRAFT' | 'PUBLISHED';
  initialCoverImage: string | null;
  initialTranslations: Translation[];
  initialCategoryIds: string[];
  allCategories: (BlogCategory & { name: Record<string, string> })[];
}

const ALL_LOCALES = ['ru', 'en', 'sr'];

export function BlogEditorForm({
  postId,
  initialSlug,
  initialStatus,
  initialCoverImage,
  initialTranslations,
  initialCategoryIds,
  allCategories
}: BlogEditorFormProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: initialSlug,
      status: initialStatus,
      coverImage: initialCoverImage,
      categoryIds: initialCategoryIds,
      translations: ALL_LOCALES.map(locale => {
        const existing = initialTranslations.find(t => t.locale === locale);
        return existing ?? { locale, title: '', description: '', content: '' };
      })
    }
  });

  const { watch, getValues, reset, setValue } = methods;

  const [activeLocale, setActiveLocale] = useState('ru');
  const [showTranslateModal, setShowTranslateModal] = useState(false);

  const translations = watch('translations');
  const coverImage = watch('coverImage');
  const categoryIds = watch('categoryIds');
  const status = watch('status');

  const { versions, restoreVersion, restoringVersion, addVersion } = useArticleVersions(
    postId,
    values => {
      reset({ ...getValues(), ...values });
    }
  );

  const { save, publish, isPending } = useBlogEditorSubmit(postId, getValues, addVersion);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save(false, false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [save]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      save(false, false);
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [translations, categoryIds, coverImage, status, save]);

  const handleTranslated = (
    locale: string,
    data: { title: string; description: string; content: string }
  ) => {
    const localeIndex = ALL_LOCALES.indexOf(locale);
    setValue(`translations.${localeIndex}.title`, data.title, { shouldDirty: true });
    setValue(`translations.${localeIndex}.description`, data.description, { shouldDirty: true });
    setValue(`translations.${localeIndex}.content`, data.content, { shouldDirty: true });
    setActiveLocale(locale);
  };

  const existingLocales = translations.filter(t => t.title).map(t => t.locale);

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col h-full bg-background">
        <BlogEditorTopBar isPending={isPending} publish={publish} save={save} />

        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          <BlogEditorMainContent
            activeLocale={activeLocale}
            setActiveLocale={setActiveLocale}
            allCategories={allCategories}
            setShowTranslateModal={setShowTranslateModal}
          />
          <BlogEditorSidebar
            allCategories={allCategories}
            versions={versions}
            restoreVersion={restoreVersion}
            restoringVersion={restoringVersion}
          />
        </div>

        <TranslateModal
          postId={postId}
          open={showTranslateModal}
          onClose={() => setShowTranslateModal(false)}
          existingLocales={existingLocales}
          onTranslated={handleTranslated}
        />
      </div>
    </FormProvider>
  );
}
