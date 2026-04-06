'use client';

import { useRef, useState } from 'react';
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
  const { saving, publishing, save, publish, uploadImage } = useBlogEditorPersistence({
    postId,
    editorRef,
    activeLocale,
    selectedDiffVersionId,
    coverImage,
    categoryIds,
    authorId,
    status,
    translations,
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranslateModal(true)}
            className="h-9 border-[#900A0B]/20 px-2 text-[#900A0B] hover:bg-[#900A0B]/5 sm:px-3"
          >
            <Languages className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Перевести</span>
          </Button>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {status !== 'PUBLISHED' && (
            <Button
              size="sm"
              onClick={() => void publish()}
              disabled={publishing || !activeTranslation.title}
              className="h-9 bg-[#900A0B] text-white shadow-sm hover:bg-[#900A0B]/90"
            >
              {publishing ? '...' : <span className="hidden sm:inline">Опубликовать</span>}
              {!publishing && <Globe className="size-4 sm:ml-1.5" />}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => void save({ showToast: true, createVersion: true })}
            disabled={saving}
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
              <div className="space-y-2">
                <Label
                  htmlFor="blog-editor-title"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
                >
                  Заголовок
                </Label>
                <Input
                  id="blog-editor-title"
                  value={activeTranslation.title}
                  onChange={event => updateTranslation('title', event.target.value)}
                  placeholder="Введите заголовок статьи"
                  className={`${BLOG_EDITOR_META_FIELD_CLASSNAME} h-12 text-base font-semibold sm:h-14 sm:text-lg`}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="blog-editor-description"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
                >
                  Описание
                </Label>
                <Textarea
                  id="blog-editor-description"
                  value={activeTranslation.description}
                  onChange={event => updateTranslation('description', event.target.value)}
                  placeholder="Введите краткое описание для карточки статьи"
                  rows={3}
                  className={`${BLOG_EDITOR_META_FIELD_CLASSNAME} min-h-[104px] resize-y py-3 text-sm text-muted-foreground sm:text-base`}
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
