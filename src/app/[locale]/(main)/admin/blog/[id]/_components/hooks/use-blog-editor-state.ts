import { useCallback, useDeferredValue, useState } from 'react';
import { ALL_BLOG_EDITOR_LOCALES } from '../blog-editor-form.constants';
import type {
  BlogEditorStatus,
  BlogEditorVersion,
  EditorTranslation
} from '../blog-editor-form.types';

interface UseBlogEditorStateParams {
  initialSlug: string;
  initialStatus: BlogEditorStatus;
  initialCoverImage: string | null;
  initialTranslations: EditorTranslation[];
  initialCategoryIds: string[];
  initialAuthorId: string;
}

/**
 * Создаёт пустой перевод для указанной локали.
 *
 * @param locale Локаль перевода.
 * @returns Пустую структуру перевода.
 */
const createEmptyTranslation = (locale: EditorTranslation['locale']): EditorTranslation => ({
  locale,
  title: '',
  description: '',
  content: ''
});

/**
 * Нормализует список переводов под все поддерживаемые локали редактора.
 *
 * @param initialTranslations Начальные переводы статьи.
 * @returns Полный список переводов для редактора.
 */
const normalizeTranslations = (initialTranslations: EditorTranslation[]) => {
  return ALL_BLOG_EDITOR_LOCALES.map(locale => {
    const existingTranslation = initialTranslations.find(
      translation => translation.locale === locale
    );

    return existingTranslation ?? createEmptyTranslation(locale);
  });
};

/**
 * Проверяет, поддерживается ли локаль текущим редактором.
 *
 * @param locale Локаль для проверки.
 * @returns `true`, если локаль входит в поддерживаемый набор.
 */
const isSupportedLocale = (locale: string): locale is EditorTranslation['locale'] => {
  return ALL_BLOG_EDITOR_LOCALES.includes(locale as EditorTranslation['locale']);
};

/**
 * Управляет локальным состоянием редактора статьи.
 *
 * @param params Начальные данные статьи.
 * @returns Состояние редактора и действия для его изменения.
 */
export const useBlogEditorState = ({
  initialSlug,
  initialStatus,
  initialCoverImage,
  initialTranslations,
  initialCategoryIds,
  initialAuthorId
}: UseBlogEditorStateParams) => {
  const [translations, setTranslations] = useState<EditorTranslation[]>(() =>
    normalizeTranslations(initialTranslations)
  );
  const [slug, setSlug] = useState(initialSlug);
  const [activeLocale, setActiveLocale] = useState<EditorTranslation['locale']>('ru');
  const [status, setStatus] = useState<BlogEditorStatus>(initialStatus);
  const [coverImage, setCoverImage] = useState<string | null>(initialCoverImage);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [authorId, setAuthorId] = useState(initialAuthorId);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const activeTranslation =
    translations.find(translation => translation.locale === activeLocale) ?? translations[0];
  const deferredPreviewContent = useDeferredValue(activeTranslation.content);
  const existingLocales = translations
    .filter(translation => translation.title || translation.description || translation.content)
    .map(({ locale }) => locale);

  /**
   * Обновляет текущее активное поле перевода.
   *
   * @param field Поле перевода.
   * @param value Новое значение поля.
   */
  const updateTranslation = useCallback(
    (field: keyof Omit<EditorTranslation, 'locale'>, value: string) => {
      setTranslations(previousTranslations =>
        previousTranslations.map(translation =>
          translation.locale === activeLocale ? { ...translation, [field]: value } : translation
        )
      );
    },
    [activeLocale]
  );

  /**
   * Применяет переведённые данные к указанной локали.
   *
   * @param locale Локаль перевода.
   * @param translatedData Полученные переводом поля.
   */
  const applyTranslatedContent = useCallback(
    (locale: string, translatedData: Omit<EditorTranslation, 'locale'>) => {
      if (!isSupportedLocale(locale)) {
        return;
      }

      setTranslations(previousTranslations =>
        previousTranslations.map(translation =>
          translation.locale === locale ? { ...translation, ...translatedData } : translation
        )
      );
      setActiveLocale(locale);
    },
    []
  );

  /**
   * Переключает состояние категории в списке выбранных.
   *
   * @param categoryId Идентификатор категории.
   */
  const toggleCategory = useCallback((categoryId: string) => {
    setCategoryIds(previousCategoryIds =>
      previousCategoryIds.includes(categoryId)
        ? previousCategoryIds.filter(selectedCategoryId => selectedCategoryId !== categoryId)
        : [...previousCategoryIds, categoryId]
    );
  }, []);

  /**
   * Применяет данные восстановленной версии к текущему черновику.
   *
   * @param version Версия статьи для восстановления.
   */
  const applyRestoredVersion = useCallback((version: BlogEditorVersion) => {
    setTranslations(normalizeTranslations(version.translations));
    setCategoryIds(version.categoryIds);
    setCoverImage(version.coverImage);
  }, []);

  return {
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
  };
};
