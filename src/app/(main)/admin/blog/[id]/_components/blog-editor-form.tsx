'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Languages, Save, Globe, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CoverImageUpload } from '@/components/admin/blog/cover-image-upload';
import { TranslateModal } from '@/components/admin/blog/translate-modal';
import { PreviewSizeSwitcher } from '@/components/admin/blog/preview-size-switcher';
import type { BlogCategory } from '@prisma/client';
import '@/styles/blog-article.css';

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

const ArticleContent = dynamic(
  () => import('@/app/(main)/blog/[slug]/_components/article-content').then(m => m.ArticleContent),
  { ssr: false }
);

interface Translation {
  locale: string;
  title: string;
  description: string;
  content: string;
}

interface BlogEditorFormProps {
  postId: string;
  initialStatus: 'DRAFT' | 'PUBLISHED';
  initialCoverImage: string | null;
  initialTranslations: Translation[];
  initialCategoryIds: string[];
  allCategories: (BlogCategory & { name: Record<string, string> })[];
}

const LOCALE_LABELS: Record<string, string> = { ru: 'RU', en: 'EN', sr: 'SR' };
const ALL_LOCALES = ['ru', 'en', 'sr'];

export function BlogEditorForm({
  postId,
  initialStatus,
  initialCoverImage,
  initialTranslations,
  initialCategoryIds,
  allCategories
}: BlogEditorFormProps) {
  const router = useRouter();
  const [translations, setTranslations] = useState<Translation[]>(
    ALL_LOCALES.map(locale => {
      const existing = initialTranslations.find(t => t.locale === locale);
      return existing ?? { locale, title: '', description: '', content: '' };
    })
  );
  const [activeLocale, setActiveLocale] = useState('ru');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initialStatus);
  const [coverImage, setCoverImage] = useState<string | null>(initialCoverImage);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const activeTranslation = translations.find(t => t.locale === activeLocale) ?? translations[0];

  const updateTranslation = (field: keyof Omit<Translation, 'locale'>, value: string) => {
    setTranslations(prev =>
      prev.map(t => (t.locale === activeLocale ? { ...t, [field]: value } : t))
    );
  };

  // Авто-сохранение каждые 30 секунд
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(
    async (showToast = true) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/blog/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coverImage,
            categoryIds,
            translations: translations.filter(t => t.title)
          })
        });
        if (!res.ok) throw new Error('Ошибка сохранения');
        if (showToast) toast.success('Сохранено');
      } catch {
        toast.error('Не удалось сохранить');
      } finally {
        setSaving(false);
      }
    },
    [postId, coverImage, categoryIds, translations]
  );

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(false), 30_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [save]);

  const handlePublish = async () => {
    await save(false);
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка публикации');
      setStatus('PUBLISHED');
      toast.success('Статья опубликована!');
      router.refresh();
    } catch {
      toast.error('Не удалось опубликовать');
    } finally {
      setPublishing(false);
    }
  };

  const handleTranslated = (
    locale: string,
    data: { title: string; description: string; content: string }
  ) => {
    setTranslations(prev => prev.map(t => (t.locale === locale ? { ...t, ...data } : t)));
    setActiveLocale(locale);
  };

  const toggleCategory = (id: string) => {
    setCategoryIds(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Ошибка загрузки');
    const data = await res.json();
    return data.url;
  };

  const existingLocales = translations.filter(t => t.title).map(t => t.locale);

  return (
    <div className="flex flex-col h-full">
      {/* Верхняя панель */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-10 flex-wrap">
        <div className="flex-1 min-w-0">
          <Input
            value={activeTranslation.title}
            onChange={e => updateTranslation('title', e.target.value)}
            placeholder="Заголовок статьи..."
            className="text-lg font-semibold border-0 border-b border-border shadow-none px-0 h-auto rounded-none focus-visible:ring-0 focus-visible:border-[#900A0B] placeholder:text-muted-foreground/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Статус */}
          <Select value={status} onValueChange={v => setStatus(v as 'DRAFT' | 'PUBLISHED')}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Черновик
                </span>
              </SelectItem>
              <SelectItem value="PUBLISHED">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Опубликовано
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Переключатель предпросмотра */}
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="size-4 mr-1.5" /> : <Eye className="size-4 mr-1.5" />}
            {showPreview ? 'Редактор' : 'Предпросмотр'}
          </Button>

          {/* Перевод */}
          <Button variant="outline" size="sm" onClick={() => setShowTranslateModal(true)}>
            <Languages className="size-4 mr-1.5" />
            Перевести
          </Button>

          {/* Публикация */}
          {status !== 'PUBLISHED' && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing || !activeTranslation.title}
              className="bg-[#900A0B] hover:bg-[#900A0B]/90 text-white"
            >
              {publishing ? 'Публикую...' : 'Опубликовать'}
            </Button>
          )}

          {/* Сохранить */}
          <Button size="sm" onClick={() => save(true)} disabled={saving} variant="default">
            <Save className="size-4 mr-1.5" />
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Основная область */}
        <div className="flex-1 flex flex-col overflow-auto min-w-0">
          {/* Языковые вкладки */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b">
            {translations.map(t => (
              <button
                key={t.locale}
                type="button"
                onClick={() => setActiveLocale(t.locale)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeLocale === t.locale
                    ? 'border-[#900A0B] text-[#900A0B]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="size-3.5" />
                {LOCALE_LABELS[t.locale]}
                {t.title && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Описание */}
          <div className="px-4 pt-3">
            <Input
              value={activeTranslation.description}
              onChange={e => updateTranslation('description', e.target.value)}
              placeholder="Краткое описание для превью..."
              className="text-sm text-muted-foreground border-dashed"
            />
          </div>

          {/* Редактор / Предпросмотр */}
          <div className="flex-1 px-4 py-3">
            {showPreview ? (
              <PreviewSizeSwitcher className="h-full">
                <div className="p-6">
                  {activeTranslation.content ? (
                    <ArticleContent content={activeTranslation.content} />
                  ) : (
                    <p className="text-muted-foreground text-sm">Нет контента для предпросмотра</p>
                  )}
                </div>
              </PreviewSizeSwitcher>
            ) : (
              <MdxEditorWrapper
                key={activeLocale}
                value={activeTranslation.content}
                onChange={v => updateTranslation('content', v)}
                onImageUpload={uploadImage}
                placeholder="Начните писать статью..."
              />
            )}
          </div>
        </div>

        {/* Правая панель */}
        <aside className="w-72 flex-shrink-0 border-l bg-muted/20 p-4 overflow-y-auto hidden lg:flex flex-col gap-5">
          {/* Обложка */}
          <CoverImageUpload value={coverImage} onChange={setCoverImage} />

          <Separator />

          {/* Категории */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Категории</p>
            {allCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Категорий пока нет</p>
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
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-[#900A0B] text-white border-[#900A0B]'
                          : 'bg-background text-foreground border-border hover:border-[#900A0B]/60'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Переводы */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Languages className="size-4" />
              Переводы
            </p>
            {translations.map(t => (
              <div key={t.locale} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.title ? 'bg-green-500' : 'bg-muted-foreground/40'
                  }`}
                />
                <span className="text-sm flex-1">
                  {t.locale === 'ru' ? 'Русский' : t.locale === 'en' ? 'English' : 'Srpski'}
                </span>
                {t.title ? (
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                    Готов
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Нет
                  </Badge>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={() => setShowTranslateModal(true)}
            >
              <Languages className="size-4 mr-1.5" />
              Перевести с ИИ
            </Button>
          </div>
        </aside>
      </div>

      {/* Модалка перевода */}
      <TranslateModal
        postId={postId}
        open={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        existingLocales={existingLocales}
        onTranslated={handleTranslated}
      />
    </div>
  );
}
