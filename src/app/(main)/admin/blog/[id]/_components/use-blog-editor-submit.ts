import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormValues, Version } from './blog-editor.schema';

export function useBlogEditorSubmit(
  postId: string,
  getValues: () => FormValues,
  addVersion: (v: Version) => void
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const save = useCallback(
    (showToast = true, createVersion = false) => {
      startTransition(async () => {
        try {
          const values = getValues();
          const filteredTranslations = values.translations.filter(t => t.title.trim().length > 0);

          const res = await fetch(`/api/admin/blog/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: values.slug,
              coverImage: values.coverImage,
              categoryIds: values.categoryIds,
              status: values.status,
              translations: filteredTranslations
            })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Ошибка сохранения');
          }

          if (createVersion && filteredTranslations.length > 0) {
            const vRes = await fetch(`/api/admin/blog/${postId}/versions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                translations: filteredTranslations,
                categoryIds: values.categoryIds,
                coverImage: values.coverImage
              })
            });
            if (vRes.ok) {
              const newVersion = await vRes.json();
              addVersion(newVersion);
            }
          }

          if (showToast) toast.success('Сохранено');
        } catch (err: any) {
          toast.error(err.message || 'Не удалось сохранить');
        }
      });
    },
    [postId, getValues, addVersion]
  );

  const publish = useCallback(() => {
    startTransition(async () => {
      try {
        const values = getValues();
        const filteredTranslations = values.translations.filter(t => t.title.trim().length > 0);

        let finalSlug = values.slug;
        if (finalSlug.startsWith('draft-') || finalSlug.startsWith('novaya-statya-')) {
          const { generateSlug } = await import('@/shared/lib/blog-utils');
          const ruTitle =
            values.translations.find(t => t.locale === 'ru')?.title ||
            values.translations[0]?.title ||
            '';
          if (ruTitle) {
            finalSlug = generateSlug(ruTitle);
          }
        }

        const saveRes = await fetch(`/api/admin/blog/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: finalSlug,
            coverImage: values.coverImage,
            categoryIds: values.categoryIds,
            status: values.status,
            translations: filteredTranslations
          })
        });
        if (!saveRes.ok) throw new Error('Ошибка сохранения перед публикацией');

        const pubRes = await fetch(`/api/admin/blog/${postId}/publish`, { method: 'POST' });
        if (!pubRes.ok) throw new Error('Ошибка публикации');

        toast.success('Статья опубликована!');
        router.refresh();
      } catch {
        toast.error('Не удалось опубликовать');
      }
    });
  }, [postId, getValues, router]);

  return { save, publish, isPending };
}
