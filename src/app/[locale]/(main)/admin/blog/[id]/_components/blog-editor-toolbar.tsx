'use client';

import { Eye, EyeOff, Globe, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { BlogEditorStatus } from './blog-editor-form.types';

interface BlogEditorToolbarProps {
  status: BlogEditorStatus;
  onStatusChange: (status: BlogEditorStatus) => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  onPublish: () => void;
  onSave: () => void;
  isPublishDisabled: boolean;
  isPublishPending: boolean;
  isSaveDisabled: boolean;
  isSavePending: boolean;
}

/**
 * Отображает верхнюю панель управления редактором статьи.
 *
 * @param props Состояние панели и обработчики действий сохранения/публикации.
 * @returns Панель инструментов редактора.
 */
export const BlogEditorToolbar = ({
  status,
  onStatusChange,
  showPreview,
  onTogglePreview,
  onPublish,
  onSave,
  isPublishDisabled,
  isPublishPending,
  isSaveDisabled,
  isSavePending
}: BlogEditorToolbarProps) => {
  const tBlog = useTranslations('Admin.blog');
  const tToolbar = useTranslations('Admin.blog.editor.toolbar');

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur-sm sm:py-3">
      <div className="-mr-4 flex items-center gap-2 overflow-x-auto py-1 pr-4 no-scrollbar sm:mr-0 sm:pr-0">
        <Select value={status} onValueChange={value => onStatusChange(value as BlogEditorStatus)}>
          <SelectTrigger className="h-9 w-[130px] text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                {tBlog('draft')}
              </span>
            </SelectItem>
            <SelectItem value="PUBLISHED">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {tBlog('published')}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={onTogglePreview} className="h-9 px-2 sm:px-3">
          {showPreview ? (
            <EyeOff className="size-4 sm:mr-1.5" />
          ) : (
            <Eye className="size-4 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">
            {showPreview ? tToolbar('editor') : tToolbar('preview')}
          </span>
        </Button>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {status !== 'PUBLISHED' && (
          <Button
            size="sm"
            onClick={onPublish}
            disabled={isPublishDisabled}
            className="h-9 bg-[#900A0B] text-white shadow-sm hover:bg-[#900A0B]/90"
          >
            {isPublishPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">{tBlog('publish')}</span>
                <Globe className="size-4 sm:ml-1.5" />
              </>
            )}
          </Button>
        )}

        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaveDisabled}
          className="h-9 bg-[#03070A] text-white hover:bg-[#03070A]/90"
        >
          {isSavePending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">
            {isSavePending ? tBlog('saving') : tBlog('save')}
          </span>
        </Button>
      </div>
    </div>
  );
};
