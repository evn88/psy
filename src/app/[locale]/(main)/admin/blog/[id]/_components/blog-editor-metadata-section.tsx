'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BLOG_EDITOR_META_FIELD_CLASS_NAME } from './blog-editor-form.constants';
import type { BlogEditorFormValues } from './blog-editor.schema';

interface BlogEditorMetadataSectionProps {
  activeTitle: string;
  onSlugChange: (slug: string) => void;
  onGenerateSlug: (title: string) => string;
}

/**
 * Нормализует значение slug под URL-совместимый формат.
 *
 * @param value Исходное значение из поля ввода.
 * @returns Нормализованный slug.
 */
const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Отображает секцию метаданных статьи с полями заголовка, slug и описания.
 *
 * @param props Внешние обработчики для синхронизации slug.
 * @returns Блок метаданных статьи.
 */
export const BlogEditorMetadataSection = ({
  activeTitle,
  onSlugChange,
  onGenerateSlug
}: BlogEditorMetadataSectionProps) => {
  const methods = useFormContext<BlogEditorFormValues>();
  const tFields = useTranslations('Admin.blog.editor.fields');

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex-1 space-y-2">
          <Label
            htmlFor="blog-editor-title"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            {tFields('titleLabel')}
          </Label>
          <Controller
            name="title"
            control={methods.control}
            render={({ field, fieldState }) => (
              <>
                <Input
                  {...field}
                  id="blog-editor-title"
                  placeholder={tFields('titlePlaceholder')}
                  className={`${BLOG_EDITOR_META_FIELD_CLASS_NAME} ${
                    fieldState.error
                      ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                      : ''
                  } h-9 text-sm font-semibold sm:text-base`}
                />
                {fieldState.error && (
                  <p className="mt-1 text-xs text-red-500">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        <div className="flex-1 space-y-2">
          <Label
            htmlFor="blog-editor-slug"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            {tFields('slugLabel')}
          </Label>
          <div className="flex items-center gap-2">
            <Controller
              name="slug"
              control={methods.control}
              render={({ field, fieldState }) => (
                <div className="flex-1">
                  <Input
                    {...field}
                    id="blog-editor-slug"
                    onChange={event => {
                      const nextSlug = normalizeSlug(event.target.value);
                      field.onChange(nextSlug);
                      onSlugChange(nextSlug);
                    }}
                    placeholder={tFields('slugPlaceholder')}
                    className={`${BLOG_EDITOR_META_FIELD_CLASS_NAME} ${
                      fieldState.error
                        ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                        : ''
                    } h-9 text-sm font-semibold sm:text-base`}
                  />
                  {fieldState.error && (
                    <p className="mt-1 text-xs text-red-500">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            <Button
              type="button"
              onClick={() => {
                const nextSlug = onGenerateSlug(activeTitle);
                methods.setValue('slug', nextSlug, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true
                });
              }}
              variant="outline"
              className="h-9 self-start px-3"
            >
              {tFields('generateSlug')}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="blog-editor-description"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
        >
          {tFields('descriptionLabel')}
        </Label>
        <Controller
          name="description"
          control={methods.control}
          render={({ field, fieldState }) => (
            <>
              <Textarea
                {...field}
                id="blog-editor-description"
                placeholder={tFields('descriptionPlaceholder')}
                rows={2}
                className={`${BLOG_EDITOR_META_FIELD_CLASS_NAME} ${
                  fieldState.error
                    ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                    : ''
                } min-h-[36px] max-h-[80px] resize-y py-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base`}
              />
              {fieldState.error && (
                <p className="mt-1 text-xs text-red-500">{fieldState.error.message}</p>
              )}
            </>
          )}
        />
      </div>
    </>
  );
};
