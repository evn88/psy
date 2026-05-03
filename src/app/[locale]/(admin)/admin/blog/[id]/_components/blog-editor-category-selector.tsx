import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BlogEditorCategory } from './blog-editor-form.types';

interface BlogEditorCategorySelectorProps {
  categories: BlogEditorCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
  variant: 'mobile' | 'desktop';
}

/**
 * Возвращает человекочитаемое имя категории.
 *
 * @param category Категория статьи.
 * @param locale Текущая локаль интерфейса.
 * @returns Подпись категории для интерфейса.
 */
const getCategoryLabel = (category: BlogEditorCategory, locale: string) => {
  return category.name[locale] ?? category.name.ru ?? category.slug;
};

/**
 * Отрисовывает список выбора категорий для редактора статьи.
 *
 * @param props Доступные категории, выбранные значения и вариант отображения.
 * @returns Блок выбора категорий.
 */
export const BlogEditorCategorySelector = ({
  categories,
  selectedCategoryIds,
  onToggleCategory,
  variant
}: BlogEditorCategorySelectorProps) => {
  const locale = useLocale();
  const tSidebar = useTranslations('Admin.blog.editor.sidebar');

  if (categories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {tSidebar('categoriesEmpty')}{' '}
        <Link href="/admin/blog/categories" className="text-[#900A0B] hover:underline">
          {tSidebar('categoriesCreate')}
        </Link>
      </p>
    );
  }

  return (
    <>
      {variant === 'desktop' && (
        <Link href="/admin/blog/categories" className="text-[#900A0B] hover:underline">
          {tSidebar('categoriesManage')}
        </Link>
      )}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const isSelected = selectedCategoryIds.includes(category.id);
          const baseClassName =
            variant === 'mobile'
              ? 'px-4 py-2 rounded-xl text-sm font-medium border transition-all'
              : 'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all';
          const stateClassName =
            variant === 'mobile'
              ? isSelected
                ? 'bg-[#900A0B] text-white border-[#900A0B] shadow-md shadow-[#900A0B]/20'
                : 'bg-background text-foreground border-border hover:border-[#900A0B]/40'
              : isSelected
                ? 'bg-[#900A0B] text-white border-[#900A0B]'
                : 'bg-background text-foreground border-border hover:border-[#900A0B]';

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-pressed={isSelected}
              className={`${baseClassName} ${stateClassName}`}
            >
              {getCategoryLabel(category, locale)}
            </button>
          );
        })}
      </div>
    </>
  );
};
