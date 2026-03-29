'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Languages,
  Save,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  History,
  RotateCcw,
  Link
} from 'lucide-react';
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

  // Версии статьи
  interface Version {
    id: string;
    savedAt: string;
    translations: Translation[];
    categoryIds: string[];
    coverImage: string | null;
  }
  const [versions, setVersions] = useState<Version[]>([]);
  const [restoringVersion, setRestoringVersion] = useState(false);

  // Загружаем версии при монтировании
  useEffect(() => {
    fetch(`/api/admin/blog/${postId}/versions`)
      .then(r => r.json())
      .then(setVersions)
      .catch(() => {});
  }, [postId]);

  const activeTranslation = translations.find(t => t.locale === activeLocale) ?? translations[0];

  const updateTranslation = (field: keyof Omit<Translation, 'locale'>, value: string) => {
    setTranslations(prev =>
      prev.map(t => (t.locale === activeLocale ? { ...t, [field]: value } : t))
    );
  };

  // Авто-сохранение каждые 30 секунд
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(
    async (showToast = true, createVersion = false) => {
      setSaving(true);
      try {
        const filteredTranslations = translations.filter(t => t.title);
        const res = await fetch(`/api/admin/blog/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coverImage,
            categoryIds,
            status,
            translations: filteredTranslations
          })
        });
        if (!res.ok) throw new Error('Ошибка сохранения');

        // Создаём снапшот версии только при ручном сохранении
        if (createVersion && filteredTranslations.length > 0) {
          const vRes = await fetch(`/api/admin/blog/${postId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translations: filteredTranslations, categoryIds, coverImage })
          });
          if (vRes.ok) {
            const newVersion = await vRes.json();
            setVersions(prev => [newVersion, ...prev].slice(0, 5));
          }
        }

        if (showToast) toast.success('Сохранено');
      } catch {
        toast.error('Не удалось сохранить');
      } finally {
        setSaving(false);
      }
    },
    [postId, coverImage, categoryIds, status, translations]
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

  const restoreVersion = async (version: Version) => {
    if (!confirm('Восстановить эту версию? Текущие несохранённые изменения будут потеряны.'))
      return;
    setRestoringVersion(true);
    try {
      setTranslations(
        ALL_LOCALES.map(locale => {
          const t = (version.translations as Translation[]).find(vt => vt.locale === locale);
          return t ?? { locale, title: '', description: '', content: '' };
        })
      );
      setCategoryIds(version.categoryIds);
      if (version.coverImage !== undefined) setCoverImage(version.coverImage);
      toast.success('Версия восстановлена — не забудьте сохранить');
    } finally {
      setRestoringVersion(false);
    }
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
    <div className="flex flex-col h-full bg-background">
      {/* Верхняя панель управления */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur-sm sm:py-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pr-4 -mr-4 sm:mr-0 sm:pr-0">
          {/* Статус */}
          <Select value={status} onValueChange={v => setStatus(v as 'DRAFT' | 'PUBLISHED')}>
            <SelectTrigger className="w-[130px] h-9 text-xs sm:text-sm">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-9 px-2 sm:px-3"
          >
            {showPreview ? (
              <EyeOff className="size-4 sm:mr-1.5" />
            ) : (
              <Eye className="size-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">{showPreview ? 'Редактор' : 'Предпросмотр'}</span>
          </Button>

          {/* Перевод */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranslateModal(true)}
            className="h-9 px-2 sm:px-3 text-[#900A0B] border-[#900A0B]/20 hover:bg-[#900A0B]/5"
          >
            <Languages className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Перевести</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Публикация */}
          {status !== 'PUBLISHED' && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing || !activeTranslation.title}
              className="h-9 bg-[#900A0B] hover:bg-[#900A0B]/90 text-white shadow-sm"
            >
              {publishing ? '...' : <span className="hidden sm:inline">Опубликовать</span>}
              {!publishing && <Globe className="size-4 sm:ml-1.5" />}
            </Button>
          )}

          {/* Сохранить */}
          <Button
            size="sm"
            onClick={() => save(true, true)}
            disabled={saving}
            variant="default"
            className="h-9 bg-[#03070A] hover:bg-[#03070A]/90 text-white"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">{saving ? 'Сохраняю...' : 'Сохранить'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Основная область контента */}
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar min-w-0 bg-background custom-scrollbar">
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
            {/* Заголовок */}
            <div className="px-4 pt-6">
              <Input
                value={activeTranslation.title}
                onChange={e => updateTranslation('title', e.target.value)}
                placeholder="Заголовок статьи..."
                className="text-2xl sm:text-3xl font-bold border-0 border-b-2 border-transparent shadow-none px-0 h-auto rounded-none focus-visible:ring-0 focus-visible:border-[#900A0B]/30 placeholder:text-muted-foreground/30 transition-all py-2"
              />
            </div>

            {/* Описание */}
            <div className="px-4 pt-4 pb-2">
              <Input
                value={activeTranslation.description}
                onChange={e => updateTranslation('description', e.target.value)}
                placeholder="Краткое описание для превью..."
                className="text-sm sm:text-base text-muted-foreground border-0 border-l-2 border-[#900A0B]/20 bg-muted/30 px-3 py-2 h-auto focus-visible:ring-0 focus-visible:border-[#900A0B] italic transition-all"
              />
            </div>

            {/* Языковые вкладки — sticky прямо над редактором */}
            <div className="flex items-center gap-1 px-4 pt-2 pb-0 border-b bg-background/90 sticky top-0 z-20 backdrop-blur-md">
              {translations.map(t => (
                <button
                  key={t.locale}
                  type="button"
                  onClick={() => setActiveLocale(t.locale)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
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

            {/* Редактор / Предпросмотр */}
            <div className="flex-1 px-2 sm:px-4 py-6">
              {showPreview ? (
                <PreviewSizeSwitcher className="min-h-[500px]">
                  <div className="p-4 sm:p-8 bg-card rounded-xl border shadow-sm">
                    {activeTranslation.content ? (
                      <ArticleContent content={activeTranslation.content} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <EyeOff className="size-10 opacity-20" />
                        <p className="text-sm font-medium">Нет контента для предпросмотра</p>
                      </div>
                    )}
                  </div>
                </PreviewSizeSwitcher>
              ) : (
                <div className="bg-card rounded-xl border shadow-sm">
                  <MdxEditorWrapper
                    key={activeLocale}
                    value={activeTranslation.content}
                    onChange={v => updateTranslation('content', v)}
                    onImageUpload={uploadImage}
                    placeholder="Начните писать статью..."
                  />
                </div>
              )}
            </div>

            {/* Мобильная секция настроек (видны только на < LG) */}
            <div className="lg:hidden p-4 space-y-8 pb-20 border-t bg-muted/5">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Настройки обложки
                </h3>
                <CoverImageUpload value={coverImage} onChange={setCoverImage} />
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

        {/* Правая панель (Desktop) */}
        <aside className="w-80 flex-shrink-0 border-l bg-muted/10 p-6 overflow-y-auto hidden lg:flex flex-col gap-8 custom-scrollbar">
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Обложка
            </h3>
            <CoverImageUpload value={coverImage} onChange={setCoverImage} />
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
                Версий пока нет. Появятся после ручного сохранения (кнопка «Сохранить»).
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
