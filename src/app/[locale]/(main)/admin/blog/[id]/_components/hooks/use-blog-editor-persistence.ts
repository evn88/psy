import type { MDXEditorMethods } from '@mdxeditor/editor';
import { useRouter } from 'next/navigation';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type {
  BlogEditorStatus,
  BlogEditorVersion,
  EditorTranslation
} from '../blog-editor-form.types';

interface BlogEditorSaveOptions {
  showToast?: boolean;
  createVersion?: boolean;
}

interface UseBlogEditorPersistenceParams {
  postId: string;
  editorRef: RefObject<MDXEditorMethods | null>;
  activeLocale: EditorTranslation['locale'];
  selectedDiffVersionId: string | null;
  coverImage: string | null;
  categoryIds: string[];
  authorId: string;
  status: BlogEditorStatus;
  translations: EditorTranslation[];
  onTranslationsChange: (translations: EditorTranslation[]) => void;
  onVersionCreated: (version: BlogEditorVersion) => void;
  onSelectedVersionReset: () => void;
  onPublished: () => void;
}

/**
 * Возвращает переводы, которые можно отправлять в API.
 *
 * @param translations Текущие переводы редактора.
 * @returns Только переводы с заполненным заголовком.
 */
const getSavableTranslations = (translations: EditorTranslation[]) => {
  return translations.filter(translation => translation.title);
};

/**
 * Считывает markdown из текущего редактора и подставляет его в активный перевод.
 *
 * @param translations Текущие переводы статьи.
 * @param activeLocale Активная локаль редактора.
 * @param editorRef Ссылка на MDX-редактор.
 * @returns Обновлённый список переводов.
 */
const syncTranslationsFromEditor = (
  translations: EditorTranslation[],
  activeLocale: EditorTranslation['locale'],
  editorRef: RefObject<MDXEditorMethods | null>
) => {
  const editorMarkdown = editorRef.current?.getMarkdown();

  if (editorMarkdown === undefined) {
    return translations;
  }

  return translations.map(translation =>
    translation.locale === activeLocale ? { ...translation, content: editorMarkdown } : translation
  );
};

/**
 * Управляет сохранением статьи, публикацией, автосохранением и загрузкой изображений.
 *
 * @param params Параметры редактора и колбэки синхронизации.
 * @returns Состояния загрузки и действия редактора.
 */
export const useBlogEditorPersistence = ({
  postId,
  editorRef,
  activeLocale,
  selectedDiffVersionId,
  coverImage,
  categoryIds,
  authorId,
  status,
  translations,
  onTranslationsChange,
  onVersionCreated,
  onSelectedVersionReset,
  onPublished
}: UseBlogEditorPersistenceParams) => {
  const router = useRouter();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isRefreshPending, startRefreshTransition] = useTransition();

  /**
   * Сохраняет статью и при необходимости создаёт снапшот версии.
   *
   * @param options Настройки сценария сохранения.
   * @returns `true`, если сохранение завершилось успешно.
   */
  const save = useCallback(
    async ({ showToast = true, createVersion = false }: BlogEditorSaveOptions = {}) => {
      if (!showToast && selectedDiffVersionId) {
        return false;
      }

      setSaving(true);

      try {
        const nextTranslations =
          showToast && selectedDiffVersionId
            ? syncTranslationsFromEditor(translations, activeLocale, editorRef)
            : translations;

        if (showToast && selectedDiffVersionId) {
          onTranslationsChange(nextTranslations);
          onSelectedVersionReset();
        }

        const savableTranslations = getSavableTranslations(nextTranslations);
        const response = await fetch(`/api/admin/blog/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coverImage,
            categoryIds,
            authorId,
            status,
            translations: savableTranslations
          })
        });

        if (!response.ok) {
          throw new Error('Ошибка сохранения');
        }

        if (createVersion && savableTranslations.length > 0) {
          const versionResponse = await fetch(`/api/admin/blog/${postId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              translations: savableTranslations,
              categoryIds,
              coverImage
            })
          });

          if (versionResponse.ok) {
            const createdVersion = (await versionResponse.json()) as BlogEditorVersion;
            onVersionCreated(createdVersion);
          }
        }

        if (showToast) {
          toast.success('Сохранено');
        }

        return true;
      } catch {
        toast.error('Не удалось сохранить');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      activeLocale,
      authorId,
      categoryIds,
      coverImage,
      editorRef,
      onSelectedVersionReset,
      onTranslationsChange,
      onVersionCreated,
      postId,
      selectedDiffVersionId,
      status,
      translations
    ]
  );

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (!selectedDiffVersionId) {
      autoSaveTimerRef.current = setTimeout(() => {
        void save({ showToast: false });
      }, 30_000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [save, selectedDiffVersionId]);

  /**
   * Публикует статью после успешного сохранения черновика.
   *
   * @returns Promise без возвращаемого значения.
   */
  const publish = useCallback(async () => {
    const isSaved = await save({ showToast: false });

    if (!isSaved) {
      return;
    }

    setPublishing(true);

    try {
      const response = await fetch(`/api/admin/blog/${postId}/publish`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Ошибка публикации');
      }

      onPublished();
      toast.success('Статья опубликована!');
      startRefreshTransition(() => router.refresh());
    } catch {
      toast.error('Не удалось опубликовать');
    } finally {
      setPublishing(false);
    }
  }, [onPublished, postId, router, save, startRefreshTransition]);

  /**
   * Загружает изображение и возвращает URL для вставки в markdown.
   *
   * @param file Файл изображения.
   * @returns URL загруженного файла.
   */
  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки');
    }

    const payload = (await response.json()) as { url: string };

    return payload.url;
  }, []);

  return {
    saving,
    publishing: publishing || isRefreshPending,
    save,
    publish,
    uploadImage
  };
};
