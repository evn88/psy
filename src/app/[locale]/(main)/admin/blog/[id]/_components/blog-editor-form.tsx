'use client';

import { useEffect, useRef, useState } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import dynamic from 'next/dynamic';
import { Eye, EyeOff, Globe, History, Languages, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CoverImageUpload } from '@/components/admin/blog/cover-image-upload';
import { PreviewSizeSwitcher } from '@/components/admin/blog/preview-size-switcher';
import { TranslateModal } from '@/components/admin/blog/translate-modal';
import { BlogEditorAuthorSelect } from './blog-editor-author-select';
import { BlogEditorCategorySelector } from './blog-editor-category-selector';
import { BLOG_EDITOR_LOCALE_TAB_LABELS } from './blog-editor-form.constants';
import type {
  BlogAuthorOption,
  BlogEditorCategory,
  BlogEditorStatus,
  EditorTranslation
} from './blog-editor-form.types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { blogEditorSchema, type BlogEditorFormValues } from './blog-editor.schema';
import { BlogEditorTranslationStatus } from './blog-editor-translation-status';
import { BlogEditorVersionHistory } from './blog-editor-version-history';
import { useBlogEditorContentSync } from './hooks/use-blog-editor-content-sync';
import { useBlogEditorPersistence } from './hooks/use-blog-editor-persistence';
import { useBlogEditorState } from './hooks/use-blog-editor-state';
import { useBlogEditorVersions } from './hooks/use-blog-editor-versions';
import '@/styles/blog-article.css';

const MdxEditorWrapper = dynamic(
  () =>
    import('@/components/admin/blog/mdx-editor-wrapper').then(module => module.MdxEditorWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground animate-pulse">
        Загрузка редактора...
      </div>
    )
  }
);

const BLOG_EDITOR_META_FIELD_CLASSNAME =
  'rounded-xl border-input bg-card shadow-sm transition-[border-color,box-shadow] focus-visible:border-[#900A0B]/40 focus-visible:ring-2 focus-visible:ring-[#900A0B]/20 focus-visible:ring-offset-0';

const ArticleContent = dynamic(
  () =>
    import('@/app/[locale]/(main)/blog/[slug]/_components/article-content').then(
      module => module.ArticleContent
    ),
  { ssr: false }
);

interface BlogEditorFormProps {
  postId: string;
  initialSlug: string;
  initialStatus: BlogEditorStatus;
  initialCoverImage: string | null;
  initialTranslations: EditorTranslation[];
  initialCategoryIds: string[];
  initialAuthorId: string;
  allCategories: BlogEditorCategory[];
  allAuthors: BlogAuthorOption[];
}

/**
 * Отображает форму редактирования статьи блога в админке.
 *
 * @param props Начальные данные статьи, категории и список авторов.
 * @returns Интерфейс редактора статьи.
 */
export function BlogEditorForm({
  postId,
  initialSlug,
  initialStatus,
  initialCoverImage,
  initialTranslations,
  initialCategoryIds,
  initialAuthorId,
  allCategories,
  allAuthors
}: BlogEditorFormProps) {
  const editorRef = useRef<MDXEditorMethods | null>(null);
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
    initialSlug,
    initialStatus,
    initialCoverImage,
    initialTranslations,
    initialCategoryIds,
    initialAuthorId
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
    postId,
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

  // Синхронизация формы при смене локали/версии/состояния
  useEffect(() => {
    methods.reset({
      title: activeTranslation.title || '',
      slug: slug || '',
      description: activeTranslation.description || ''
    });
  }, [activeLocale, activeTranslation.title, slug, activeTranslation.description, methods]);

  // Обновление локального стейта при изменении полей формы
  useEffect(() => {
    const subscription = methods.watch((value, { name, type }) => {
      if (type === 'change') {
        if (name === 'title' && value.title !== undefined) {
          updateTranslation('title', value.title);
        }
        if (name === 'description' && value.description !== undefined) {
          updateTranslation('description', value.description);
        }
        if (name === 'slug' && value.slug !== undefined) {
          // slug is already updated via its onChange wrapper manually to enforce lowercase dashes
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [methods, updateTranslation]);
  const { saving, publishing, save, publish, uploadImage, generateSlugForTitle } =
    useBlogEditorPersistence({
      postId,
      editorRef,
      activeLocale,
      selectedDiffVersionId,
      slug,
      setSlug,
      coverImage,
      categoryIds,
      authorId,
      status,
      translations,
      isValid: methods.formState.isValid,
      onTranslationsChange: setTranslations,
      onVersionCreated: prependVersion,
      onSelectedVersionReset: () => setSelectedDiffVersionId(null),
      onPublished: () => setStatus('PUBLISHED')
    });

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur-sm sm:py-3">
        <div className="-mr-4 flex items-center gap-2 overflow-x-auto py-1 pr-4 no-scrollbar sm:mr-0 sm:pr-0">
          <Select value={status} onValueChange={value => setStatus(value as BlogEditorStatus)}>
            <SelectTrigger className="h-9 w-[130px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  Черновик
                </span>
              </SelectItem>
              <SelectItem value="PUBLISHED">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Опубликовано
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(previousValue => !previousValue)}
            className="h-9 px-2 sm:px-3"
          >
            {showPreview ? (
              <EyeOff className="size-4 sm:mr-1.5" />
            ) : (
              <Eye className="size-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">{showPreview ? 'Редактор' : 'Предпросмотр'}</span>
          </Button>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {status !== 'PUBLISHED' && (
            <Button
              size="sm"
              onClick={() => void publish()}
              disabled={publishing || !activeTranslation.title || !methods.formState.isValid}
              className="h-9 bg-[#900A0B] text-white shadow-sm hover:bg-[#900A0B]/90"
            >
              {publishing ? '...' : <span className="hidden sm:inline">Опубликовать</span>}
              {!publishing && <Globe className="size-4 sm:ml-1.5" />}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => void save({ showToast: true, createVersion: true })}
            disabled={saving || !methods.formState.isValid}
            className="h-9 bg-[#03070A] text-white hover:bg-[#03070A]/90"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">{saving ? 'Сохраняю...' : 'Сохранить'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="custom-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto bg-background no-scrollbar">
          <div className="mx-auto flex w-full max-w-5xl flex-col pb-20">
            <div className="space-y-4 px-4 pb-2 pt-6">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="blog-editor-title"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
                  >
                    Заголовок
                  </Label>
                  <Controller
                    name="title"
                    control={methods.control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="blog-editor-title"
                          placeholder="Введите заголовок статьи"
                          className={`${BLOG_EDITOR_META_FIELD_CLASSNAME} ${
                            fieldState.error
                              ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                              : ''
                          } h-9 text-sm font-semibold sm:text-base`}
                        />
                        {fieldState.error && (
                          <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="blog-editor-slug"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
                  >
                    Ссылка (Slug)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="slug"
                      control={methods.control}
                      render={({ field, fieldState }) => (
                        <div className="flex-1">
                          <Input
                            {...field}
                            id="blog-editor-slug"
                            onChange={e => {
                              const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                              field.onChange(v);
                              setSlug(v);
                            }}
                            placeholder="adresa-stati"
                            className={`${BLOG_EDITOR_META_FIELD_CLASSNAME} ${
                              fieldState.error
                                ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                                : ''
                            } h-9 text-sm font-semibold sm:text-base`}
                          />
                          {fieldState.error && (
                            <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const newSlug = generateSlugForTitle(activeTranslation.title);
                        methods.setValue('slug', newSlug, { shouldValidate: true });
                      }}
                      variant="outline"
                      className="h-9 px-3 self-start"
                    >
                      Сгенерировать
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="blog-editor-description"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
                >
                  Описание
                </Label>
                <Controller
                  name="description"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Textarea
                        {...field}
                        id="blog-editor-description"
                        placeholder="Введите краткое описание для карточки статьи"
                        rows={2}
                        className={`${BLOG_EDITOR_META_FIELD_CLASSNAME} ${
                          fieldState.error
                            ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                            : ''
                        } min-h-[36px] max-h-[80px] resize-y py-1.5 text-sm text-muted-foreground sm:text-base leading-relaxed`}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 pb-0 pt-2 backdrop-blur-md">
              <div className="flex items-center gap-1">
                {translations.map(translation => (
                  <button
                    key={translation.locale}
                    type="button"
                    onClick={() => setActiveLocale(translation.locale)}
                    className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                      activeLocale === translation.locale
                        ? 'border-[#900A0B] bg-[#900A0B]/5 text-[#900A0B]'
                        : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Globe className="size-3.5" />
                    {BLOG_EDITOR_LOCALE_TAB_LABELS[translation.locale]}
                    {translation.title && (
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    )}
                  </button>
                ))}
              </div>
              <div id="mdx-editor-view-mode" className="flex h-full items-center pb-1" />
            </div>

            <div className="flex-1 px-2 py-6 sm:px-4">
              {showPreview ? (
                <PreviewSizeSwitcher className="min-h-[500px]">
                  <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-8">
                    {deferredPreviewContent ? (
                      <ArticleContent content={deferredPreviewContent} />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                        <EyeOff className="size-10 opacity-20" />
                        <p className="text-sm font-medium">Нет контента для предпросмотра</p>
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
                    placeholder="Начните писать статью..."
                    diffMarkdown={diffMarkdown}
                    readOnly={false}
                    onTranslateClick={() => setShowTranslateModal(true)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-8 border-t bg-muted/5 p-4 pb-20 lg:hidden">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Настройки обложки
                </h3>
                <CoverImageUpload value={coverImage} onChange={setCoverImage} />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Категории
                </h3>
                <BlogEditorCategorySelector
                  categories={allCategories}
                  selectedCategoryIds={categoryIds}
                  onToggleCategory={toggleCategory}
                  variant="mobile"
                />
                <BlogEditorAuthorSelect
                  authors={allAuthors}
                  value={authorId}
                  onChange={setAuthorId}
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="custom-scrollbar hidden w-80 flex-shrink-0 flex-col gap-8 overflow-y-auto border-l bg-muted/10 p-6 lg:flex">
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Обложка
            </h3>
            <CoverImageUpload value={coverImage} onChange={setCoverImage} />
          </section>

          <Separator className="bg-border/60" />

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Категории
            </h3>
            <BlogEditorCategorySelector
              categories={allCategories}
              selectedCategoryIds={categoryIds}
              onToggleCategory={toggleCategory}
              variant="desktop"
            />
            <BlogEditorAuthorSelect authors={allAuthors} value={authorId} onChange={setAuthorId} />
          </section>

          <Separator className="bg-border/60" />

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              <History className="size-3.5" />
              История версий
            </h3>
            <BlogEditorVersionHistory
              versions={versions}
              selectedDiffVersionId={selectedDiffVersionId}
              restoringVersion={restoringVersion}
              onSelectVersion={setSelectedDiffVersionId}
              onRestoreVersion={version => void restoreVersion(version)}
            />
          </section>

          <Separator className="bg-border/60" />

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              <Languages className="size-3.5" />
              Статус переводов
            </h3>
            <BlogEditorTranslationStatus translations={translations} />
          </section>
        </aside>
      </div>

      <TranslateModal
        postId={postId}
        open={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        existingLocales={existingLocales}
        onTranslated={applyTranslatedContent}
      />
    </div>
  );
}
