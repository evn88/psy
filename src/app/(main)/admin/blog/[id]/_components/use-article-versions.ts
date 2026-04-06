import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormValues, Version, Translation } from './blog-editor.schema';

const ALL_LOCALES = ['ru', 'en', 'sr'];

export function useArticleVersions(
  postId: string,
  formReset: (values: Partial<FormValues>) => void
) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [restoringVersion, setRestoringVersion] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/blog/${postId}/versions`)
      .then(r => r.json())
      .then(setVersions)
      .catch(() => {});
  }, [postId]);

  const restoreVersion = async (version: Version) => {
    if (!confirm('Восстановить эту версию? Текущие несохранённые изменения будут потеряны.')) {
      return;
    }

    setRestoringVersion(true);
    try {
      const restoredTranslations = ALL_LOCALES.map(locale => {
        const t = (version.translations as Translation[]).find(vt => vt.locale === locale);
        return t ?? { locale, title: '', description: '', content: '' };
      });

      formReset({
        translations: restoredTranslations,
        categoryIds: version.categoryIds,
        coverImage: version.coverImage ?? null
      });

      toast.success('Версия восстановлена — не забудьте сохранить');
    } finally {
      setRestoringVersion(false);
    }
  };

  const addVersion = (newVersion: Version) => {
    setVersions(prev => [newVersion, ...prev].slice(0, 5));
  };

  return { versions, restoreVersion, restoringVersion, addVersion };
}
