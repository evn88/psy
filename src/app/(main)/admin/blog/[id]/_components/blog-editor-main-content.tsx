import dynamic from 'next/dynamic';
import { useFormContext, useWatch } from 'react-hook-form';
import { Globe } from 'lucide-react';
import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CoverImageUpload } from '@/components/admin/blog/cover-image-upload';
import type { BlogCategory } from '@prisma/client';
import { FormValues, Translation } from './blog-editor.schema';

const MdxEditorWrapper = dynamic(
  () => import('@/components/admin/blog/mdx-editor-wrapper').then(m => m.MdxEditorWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 border rounded-md animate-pulse bg-muted flex items-center justify-center text-muted-foreground text-sm">
        Загрузка редактора...
      </div>
    )
  }
);

interface BlogEditorMainContentProps {
  activeLocale: string;
  setActiveLocale: (locale: string) => void;
  allCategories: (BlogCategory & { name: Record<string, string> })[];
}

const LOCALE_LABELS: Record<string, string> = { ru: 'RU', en: 'EN', sr: 'SR' };
const ALL_LOCALES = ['ru', 'en', 'sr'];
const META_INPUT_BASE_CLASSNAME =
  'rounded-xl border-input bg-card shadow-sm transition-[border-color,box-shadow] focus-visible:border-[#900A0B]/40 focus-visible:ring-2 focus-visible:ring-[#900A0B]/20 focus-visible:ring-offset-0';

export function BlogEditorMainContent({
  activeLocale,
  setActiveLocale,
  allCategories
}: BlogEditorMainContentProps) {
  const { control, setValue, getValues } = useFormContext<FormValues>();

  const translations = useWatch({ control, name: 'translations' });
  const coverImage = useWatch({ control, name: 'coverImage' });
  const categoryIds = useWatch({ control, name: 'categoryIds' });
  const slug = useWatch({ control, name: 'slug' });

  const activeTranslationIndex = ALL_LOCALES.indexOf(activeLocale);
  const activeTranslation = translations[activeTranslationIndex] ?? translations[0];

  const updateTranslationField = (field: keyof Omit<Translation, 'locale'>, value: string) => {
    setValue(`translations.${activeTranslationIndex}.${field}`, value, { shouldDirty: true });
  };

  const toggleCategory = (id: string) => {
    const current = getValues('categoryIds');
    const updated = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    setValue('categoryIds', updated, { shouldDirty: true });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Ошибка загрузки');
    const data = await res.json();
    return data.url;
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar min-w-0 bg-background custom-scrollbar">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Поля Заголовок, Slug и Описание */}
        <div className="space-y-3 px-4 pb-2 pt-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="space-y-1.5 flex-1">
              <Label
                htmlFor="blog-editor-title"
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
              >
                Заголовок
              </Label>
              <Input
                id="blog-editor-title"
                value={activeTranslation.title}
                onChange={e => updateTranslationField('title', e.target.value)}
                placeholder="Введите заголовок статьи"
                className={`${META_INPUT_BASE_CLASSNAME} h-9 text-sm font-semibold`}
              />
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="blog-editor-slug"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
                >
                  Slug (URL)
                </Label>
                <button
                  type="button"
                  onClick={async () => {
                    const ruTitle =
                      translations.find(t => t.locale === 'ru')?.title || activeTranslation.title;
                    if (ruTitle) {
                      const { generateSlug } = await import('@/shared/lib/blog-utils');
                      setValue('slug', generateSlug(ruTitle), { shouldDirty: true });
                    }
                  }}
                  className="text-[10px] text-[#900A0B] hover:underline font-medium"
                >
                  Сгенерировать
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground/50 text-sm pointer-events-none">
                  /blog/
                </span>
                <Input
                  id="blog-editor-slug"
                  value={slug || ''}
                  onChange={e =>
                    setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'), {
                      shouldDirty: true
                    })
                  }
                  placeholder="post-slug"
                  className={`${META_INPUT_BASE_CLASSNAME} h-9 text-sm pl-14 font-mono text-muted-foreground`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="blog-editor-description"
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
            >
              Описание
            </Label>
            <Textarea
              id="blog-editor-description"
              value={activeTranslation.description}
              onChange={e => updateTranslationField('description', e.target.value)}
              placeholder="Краткое описание для карточки"
              rows={1}
              className={`${META_INPUT_BASE_CLASSNAME} min-h-[36px] max-h-[80px] resize-y py-1.5 text-sm text-muted-foreground leading-relaxed`}
            />
          </div>
        </div>

        {/* Языковые вкладки */}
        <div className="sticky top-0 z-20 flex items-center gap-1 border-b bg-background/95 px-4 pt-2 pb-0 backdrop-blur-md mt-2">
          {translations.map(t => (
            <button
              key={t.locale}
              type="button"
              onClick={() => setActiveLocale(t.locale)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px ${
                activeLocale === t.locale
                  ? 'border-[#900A0B] text-[#900A0B] bg-[#900A0B]/5 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Globe className="size-3.5" />
              {LOCALE_LABELS[t.locale]}
              {t.title && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* Редактор */}
        <div className="flex-1 px-2 sm:px-4 py-4">
          <div className="bg-card rounded-xl border shadow-sm">
            <MdxEditorWrapper
              key={activeLocale}
              value={activeTranslation.content}
              onChange={v => updateTranslationField('content', v)}
              onImageUpload={uploadImage}
              placeholder="Начните писать статью..."
            />
          </div>
        </div>

        {/* Мобильная секция настроек */}
        <div className="lg:hidden p-4 space-y-8 pb-20 border-t bg-muted/5">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Настройки обложки
            </h3>
            <CoverImageUpload
              value={coverImage}
              onChange={v => setValue('coverImage', v, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => {
                  const name = (cat.name as Record<string, string>)?.ru ?? cat.slug;
                  const selected = categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-[#900A0B] text-white border-[#900A0B] shadow-md shadow-[#900A0B]/20'
                          : 'bg-background text-foreground border-border hover:border-[#900A0B]/40'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
