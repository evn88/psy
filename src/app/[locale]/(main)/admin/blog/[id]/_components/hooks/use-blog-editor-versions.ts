import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { BlogEditorVersion } from '../blog-editor-form.types';

interface UseBlogEditorVersionsParams {
  postId: string;
  onRestoreVersion: (version: BlogEditorVersion) => void;
}

/**
 * Управляет историей версий статьи и восстановлением снапшотов.
 *
 * @param params Параметры загрузки и восстановления версий.
 * @returns Состояние истории версий и управляющие действия.
 */
export const useBlogEditorVersions = ({
  postId,
  onRestoreVersion
}: UseBlogEditorVersionsParams) => {
  const tVersioning = useTranslations('Admin.blog.editor.versioning');
  const [versions, setVersions] = useState<BlogEditorVersion[]>([]);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [selectedDiffVersionId, setSelectedDiffVersionId] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    /**
     * Загружает последние сохранённые версии статьи.
     *
     * @returns Promise без возвращаемого значения.
     */
    const loadVersions = async () => {
      try {
        const response = await fetch(`/api/admin/blog/${postId}/versions`, {
          signal: abortController.signal
        });

        if (!response.ok) {
          return;
        }

        const loadedVersions = (await response.json()) as BlogEditorVersion[];

        if (!abortController.signal.aborted) {
          setVersions(loadedVersions);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    };

    void loadVersions();

    return () => {
      abortController.abort();
    };
  }, [postId]);

  const selectedVersion = versions.find(version => version.id === selectedDiffVersionId) ?? null;

  /**
   * Добавляет новую версию в начало истории и ограничивает её размер.
   *
   * @param version Новая версия статьи.
   */
  const prependVersion = useCallback((version: BlogEditorVersion) => {
    setVersions(previousVersions => [version, ...previousVersions].slice(0, 5));
  }, []);

  /**
   * Восстанавливает выбранную версию статьи в текущий черновик.
   *
   * @param version Версия статьи для восстановления.
   * @returns Promise без возвращаемого значения.
   */
  const restoreVersion = useCallback(
    async (version: BlogEditorVersion) => {
      const shouldRestore = window.confirm(tVersioning('confirmRestore'));

      if (!shouldRestore) {
        return;
      }

      setRestoringVersion(true);

      try {
        onRestoreVersion(version);
        toast.success(tVersioning('restoreSuccess'));
      } finally {
        setRestoringVersion(false);
      }
    },
    [onRestoreVersion, tVersioning]
  );

  return {
    versions,
    selectedVersion,
    selectedDiffVersionId,
    setSelectedDiffVersionId,
    restoringVersion,
    prependVersion,
    restoreVersion
  };
};
