'use client';

import { useEffect, useRef, useTransition } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';
import { PreviewSizeSwitcher } from '@/components/admin/blog/preview-size-switcher';
import { TranslateModal } from '@/components/admin/blog/translate-modal';
import {
  MdxEditorWrapper,
  BLOG_EDITOR_VIEW_MODE_TARGET_ID
} from '@/components/admin/blog/mdx-editor-wrapper';
import { BLOG_EDITOR_EMPTY_PREVIEW_ICON_CLASS_NAME } from './blog-editor-form.constants';
import { BlogEditorLocaleTabs } from './blog-editor-locale-tabs';
import { BlogEditorMetadataSection } from './blog-editor-metadata-section';
import { type BlogEditorFormValues, blogEditorSchema } from './blog-editor.schema';
import { BlogEditorSidebar } from './blog-editor-sidebar';
import { BlogEditorToolbar } from './blog-editor-toolbar';
import type { BlogEditorInitialData, BlogEditorLocale } from './blog-editor-form.types';
import { useBlogEditorContentSync } from './hooks/use-blog-editor-content-sync';
import { useBlogEditorLock } from './hooks/use-blog-editor-lock';
import { useBlogEditorPersistence } from './hooks/use-blog-editor-persistence';
import { useBlogEditorState } from './hooks/use-blog-editor-state';
import { useBlogEditorVersions } from './hooks/use-blog-editor-versions';

const ArticleContent = dynamic(
  () =>
    import('@/app/[locale]/(main)/blog/[slug]/_components/article-content').then(
      module => module.ArticleContent
    ),
  { ssr: false }
);

interface BlogEditorFormProps {
  initialData: BlogEditorInitialData;
}

/**
 * Отображает форму редактирования статьи блога в админке.
 *
 * @param props Начальные данные статьи, категорий и авторов.
 * @returns Интерфейс редактора статьи.
 */
export const BlogEditorForm = ({ initialData }: BlogEditorFormProps) => {
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const tEditor = useTranslations('Admin.blog.editor');
  const [isLocalePending, startLocaleTransition] = useTransition();
  const { editorInstanceId, isLockedByOther, ownerName } = useBlogEditorLock({
    postId: initialData.postId
  });

  const {
    slug,
    setSlug,
    translations,
    setTranslations,
    activeLocale,
    setActiveLocale,
    activeTranslation,
    deferredPreviewContent,
    status,
    setStatus,
    coverImage,
    setCoverImage,
    categoryIds,
    toggleCategory,
    authorId,
    setAuthorId,
    showTranslateModal,
    setShowTranslateModal,
    showPreview,
    setShowPreview,
    existingLocales,
    updateTranslation,
    applyTranslatedContent,
    applyRestoredVersion
  } = useBlogEditorState({
    initialSlug: initialData.slug,
    initialStatus: initialData.status,
    initialCoverImage: initialData.coverImage,
    initialTranslations: initialData.translations,
    initialCategoryIds: initialData.categoryIds,
    initialAuthorId: initialData.authorId
  });

  const {
    versions,
    selectedVersion,
    selectedDiffVersionId,
    setSelectedDiffVersionId,
    restoringVersion,
    prependVersion,
    restoreVersion
  } = useBlogEditorVersions({
    postId: initialData.postId,
    onRestoreVersion: applyRestoredVersion
  });

  const { editorValue, diffMarkdown } = useBlogEditorContentSync({
    editorRef,
    activeLocale,
    activeTranslation,
    selectedVersion
  });

  const methods = useForm<BlogEditorFormValues>({
    resolver: zodResolver(blogEditorSchema),
    defaultValues: {
      title: activeTranslation.title || '',
      slug: slug || '',
      description: activeTranslation.description || ''
    },
    mode: 'onChange'
  });
  const { formState, reset } = methods;

  useEffect(() => {
    reset({
      title: activeTranslation.title || '',
      slug: slug || '',
      description: activeTranslation.description || ''
    });
  }, [activeLocale, activeTranslation.description, activeTranslation.title, reset, slug]);

  const draftSignature = JSON.stringify({
    slug,
    status,
    coverImage,
    categoryIds,
    authorId,
    translations
  });

  const { saving, publishing, save, publish, uploadImage, generateSlugForTitle } =
    useBlogEditorPersistence({
      postId: initialData.postId,
      editorRef,
      editorInstanceId,
      activeLocale,
      selectedDiffVersionId,
      slug,
      setSlug,
      coverImage,
      categoryIds,
      authorId,
      status,
      translations,
      draftSignature,
      isLockedByOther,
      isValid: formState.isValid,
      onTranslationsChange: setTranslations,
      onVersionCreated: prependVersion,
      onSelectedVersionReset: () => setSelectedDiffVersionId(null),
      onPublished: () => setStatus('PUBLISHED')
    });

  const handleLocaleChange = (locale: BlogEditorLocale) => {
    startLocaleTransition(() => {
      setActiveLocale(locale);
    });
  };

  const sidebarProps = {
    coverImage,
    onCoverImageChange: setCoverImage,
    categories: initialData.categories,
    selectedCategoryIds: categoryIds,
    onToggleCategory: toggleCategory,
    authors: initialData.authors,
    authorId,
    onAuthorChange: setAuthorId,
    versions,
    selectedDiffVersionId,
    restoringVersion,
    onSelectVersion: setSelectedDiffVersionId,
    onRestoreVersion: (version: (typeof versions)[number]) => void restoreVersion(version),
    translations
  };
  const sourceTranslation = translations.find(translation => translation.locale === 'ru') ?? null;

  return (
    <FormProvider {...methods}>
      <div className="flex h-full flex-col bg-background">
        <BlogEditorToolbar
          status={status}
          onStatusChange={setStatus}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(previousValue => !previousValue)}
          onPublish={() => void publish()}
          onSave={() => void save({ showToast: true, createVersion: true })}
          isPublishDisabled={
            isLockedByOther || publishing || !activeTranslation.title || !formState.isValid
          }
          isPublishPending={publishing}
          isSaveDisabled={isLockedByOther || saving || !formState.isValid}
          isSavePending={saving}
          isLockedByOther={isLockedByOther}
          lockOwnerName={ownerName}
        />

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="custom-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto bg-background no-scrollbar">
            <div className="mx-auto flex w-full max-w-5xl flex-col pb-20">
              <div className="space-y-4 px-4 pb-2 pt-6">
                <BlogEditorMetadataSection
                  activeTitle={activeTranslation.title}
                  onSlugChange={setSlug}
                  onGenerateSlug={generateSlugForTitle}
                  onTitleChange={value => updateTranslation('title', value)}
                  onDescriptionChange={value => updateTranslation('description', value)}
                />
              </div>

              <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 pb-0 pt-2 backdrop-blur-md">
                <BlogEditorLocaleTabs
                  translations={translations}
                  activeLocale={activeLocale}
                  onSelectLocale={handleLocaleChange}
                  isPending={isLocalePending}
                />
                <div
                  id={BLOG_EDITOR_VIEW_MODE_TARGET_ID}
                  className="flex h-full items-center pb-1"
                />
              </div>

              <div className="flex-1 px-2 py-6 sm:px-4">
                {showPreview ? (
                  <PreviewSizeSwitcher className="min-h-[500px]">
                    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-8">
                      {deferredPreviewContent ? (
                        <ArticleContent content={deferredPreviewContent} />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                          <EyeOff className={BLOG_EDITOR_EMPTY_PREVIEW_ICON_CLASS_NAME} />
                          <p className="text-sm font-medium">{tEditor('preview.emptyState')}</p>
                        </div>
                      )}
                    </div>
                  </PreviewSizeSwitcher>
                ) : (
                  <div className="flex flex-col rounded-xl border bg-card shadow-sm">
                    <MdxEditorWrapper
                      key={activeLocale}
                      ref={editorRef}
                      value={editorValue}
                      onChange={value => {
                        if (!selectedVersion) {
                          updateTranslation('content', value);
                        }
                      }}
                      onImageUpload={uploadImage}
                      placeholder={tEditor('mdx.placeholder')}
                      diffMarkdown={diffMarkdown}
                      readOnly={false}
                      onTranslateClick={() => setShowTranslateModal(true)}
                    />
                  </div>
                )}
              </div>

              <BlogEditorSidebar layout="mobile" {...sidebarProps} />
            </div>
          </div>

          <BlogEditorSidebar layout="desktop" {...sidebarProps} />
        </div>

        <TranslateModal
          open={showTranslateModal}
          onClose={() => setShowTranslateModal(false)}
          existingLocales={existingLocales}
          sourceTranslation={sourceTranslation}
          onTranslated={applyTranslatedContent}
        />
      </div>
    </FormProvider>
  );
};
