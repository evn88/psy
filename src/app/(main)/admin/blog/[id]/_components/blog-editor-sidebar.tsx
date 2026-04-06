import { History, Languages, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useFormContext, useWatch } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CoverImageUpload } from '@/components/admin/blog/cover-image-upload';
import type { BlogCategory } from '@prisma/client';
import { FormValues, Version } from './blog-editor.schema';

interface BlogEditorSidebarProps {
  allCategories: (BlogCategory & { name: Record<string, string> })[];
  versions: Version[];
  restoreVersion: (v: Version) => void;
  restoringVersion: boolean;
}

export function BlogEditorSidebar({
  allCategories,
  versions,
  restoreVersion,
  restoringVersion
}: BlogEditorSidebarProps) {
  const { control, setValue, getValues } = useFormContext<FormValues>();

  const translations = useWatch({ control, name: 'translations' });
  const coverImage = useWatch({ control, name: 'coverImage' });
  const categoryIds = useWatch({ control, name: 'categoryIds' });

  const toggleCategory = (id: string) => {
    const current = getValues('categoryIds');
    const updated = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    setValue('categoryIds', updated, { shouldDirty: true });
  };

  return (
    <aside className="w-80 flex-shrink-0 border-l bg-muted/10 p-6 overflow-y-auto hidden lg:flex flex-col gap-8 custom-scrollbar">
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          Обложка
        </h3>
        <CoverImageUpload
          value={coverImage}
          onChange={v => setValue('coverImage', v, { shouldDirty: true })}
        />
      </section>

      <Separator className="bg-border/60" />

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          Категории
        </h3>
        {allCategories.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Нет категорий.{' '}
            <Link href="/admin/blog/categories" className="text-[#900A0B] hover:underline">
              Создать
            </Link>
          </p>
        ) : (
          <>
            <Link href="/admin/blog/categories" className="text-[#900A0B] hover:underline text-xs">
              Изменить
            </Link>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(cat => {
                const name = (cat.name as Record<string, string>)?.ru ?? cat.slug;
                const selected = categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-[#900A0B] text-white border-[#900A0B]'
                        : 'bg-background text-foreground border-border hover:border-[#900A0B]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Separator className="bg-border/60" />

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
          <History className="size-3.5" />
          История версий
        </h3>
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Версий пока нет. Появятся после ручного сохранения.
          </p>
        ) : (
          <div className="space-y-1.5">
            {versions.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40"
              >
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {i === 0 ? 'Последняя' : `Версия ${versions.length - i}`}
                  </span>
                  <span className="block text-[10px] mt-0.5">
                    {new Date(v.savedAt).toLocaleString('ru', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => restoreVersion(v)}
                  disabled={restoringVersion}
                  className="p-1 rounded text-muted-foreground/60 hover:text-[#900A0B] hover:bg-[#900A0B]/5 transition-colors"
                  title="Восстановить эту версию"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator className="bg-border/60" />

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
          <Languages className="size-3.5" />
          Статус переводов
        </h3>
        <div className="space-y-3">
          {translations.map(t => (
            <div
              key={t.locale}
              className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40"
            >
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${t.title ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-muted-foreground/30'}`}
                />
                <span>
                  {t.locale === 'ru' ? 'Русский' : t.locale === 'en' ? 'English' : 'Srpski'}
                </span>
              </div>
              {t.title ? (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold text-green-600 border-green-600/20 bg-green-600/5"
                >
                  Ready
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold text-muted-foreground/60"
                >
                  None
                </Badge>
              )}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
