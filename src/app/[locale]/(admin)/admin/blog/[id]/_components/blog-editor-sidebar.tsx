'use client';

import { History, Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CoverImageUpload } from './cover-image-upload';
import { Separator } from '@/components/ui/separator';
import { BlogEditorAuthorSelect } from './blog-editor-author-select';
import { BlogEditorCategorySelector } from './blog-editor-category-selector';
import { BlogEditorTranslationStatus } from './blog-editor-translation-status';
import { BlogEditorVersionHistory } from './blog-editor-version-history';
import type {
  BlogAuthorOption,
  BlogEditorCategory,
  BlogEditorVersion,
  EditorTranslation
} from './blog-editor-form.types';

interface BlogEditorSidebarProps {
  layout: 'mobile' | 'desktop';
  coverImage: string | null;
  onCoverImageChange: (url: string | null) => void;
  categories: BlogEditorCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
  authors: BlogAuthorOption[];
  authorId: string;
  onAuthorChange: (authorId: string) => void;
  versions: BlogEditorVersion[];
  selectedDiffVersionId: string | null;
  restoringVersion: boolean;
  onSelectVersion: (versionId: string | null) => void;
  onRestoreVersion: (version: BlogEditorVersion) => void;
  translations: EditorTranslation[];
}

interface BlogEditorSidebarContentProps extends Omit<BlogEditorSidebarProps, 'layout'> {
  isMobile: boolean;
}

/**
 * Отрисовывает общее содержимое боковой панели редактора.
 *
 * @param props Данные боковой панели и признак мобильной раскладки.
 * @returns Секции боковой панели.
 */
const BlogEditorSidebarContent = ({
  isMobile,
  coverImage,
  onCoverImageChange,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  authors,
  authorId,
  onAuthorChange,
  versions,
  selectedDiffVersionId,
  restoringVersion,
  onSelectVersion,
  onRestoreVersion,
  translations
}: BlogEditorSidebarContentProps) => {
  const tSidebar = useTranslations('Admin.blog.editor.sidebar');

  const headingClassName = isMobile
    ? 'text-sm font-bold uppercase tracking-wider text-muted-foreground'
    : 'text-xs font-bold uppercase tracking-widest text-muted-foreground/60';

  return (
    <>
      <section className="space-y-4">
        <h3 className={headingClassName}>{tSidebar('coverTitle')}</h3>
        <CoverImageUpload value={coverImage} onChange={onCoverImageChange} />
      </section>

      <Separator className={isMobile ? undefined : 'bg-border/60'} />

      <section className="space-y-4">
        <h3 className={headingClassName}>{tSidebar('categoriesTitle')}</h3>
        <BlogEditorCategorySelector
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={onToggleCategory}
          variant={isMobile ? 'mobile' : 'desktop'}
        />
        <BlogEditorAuthorSelect authors={authors} value={authorId} onChange={onAuthorChange} />
      </section>

      {!isMobile && (
        <>
          <Separator className="bg-border/60" />

          <section className="space-y-3">
            <h3 className={`flex items-center gap-2 ${headingClassName}`}>
              <History className="size-3.5" />
              {tSidebar('versionsTitle')}
            </h3>
            <BlogEditorVersionHistory
              versions={versions}
              selectedDiffVersionId={selectedDiffVersionId}
              restoringVersion={restoringVersion}
              onSelectVersion={onSelectVersion}
              onRestoreVersion={onRestoreVersion}
            />
          </section>

          <Separator className="bg-border/60" />

          <section className="space-y-4">
            <h3 className={`flex items-center gap-2 ${headingClassName}`}>
              <Languages className="size-3.5" />
              {tSidebar('translationsTitle')}
            </h3>
            <BlogEditorTranslationStatus translations={translations} />
          </section>
        </>
      )}
    </>
  );
};

/**
 * Отображает боковую панель редактора в мобильной или десктопной раскладке.
 *
 * @param props Данные панели и нужная раскладка.
 * @returns Контейнер боковой панели.
 */
export const BlogEditorSidebar = ({ layout, ...props }: BlogEditorSidebarProps) => {
  if (layout === 'mobile') {
    return (
      <div className="space-y-8 border-t bg-muted/5 p-4 pb-20 lg:hidden">
        <BlogEditorSidebarContent {...props} isMobile />
      </div>
    );
  }

  return (
    <aside className="custom-scrollbar hidden w-80 flex-shrink-0 flex-col gap-8 overflow-y-auto border-l bg-muted/10 p-6 lg:flex">
      <BlogEditorSidebarContent {...props} isMobile={false} />
    </aside>
  );
};
