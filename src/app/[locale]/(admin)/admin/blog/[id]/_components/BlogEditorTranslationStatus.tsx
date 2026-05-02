import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { BLOG_EDITOR_LOCALE_MESSAGE_KEYS } from './blog-editor-form.constants';
import type { EditorTranslation } from './blog-editor-form.types';

interface BlogEditorTranslationStatusProps {
  translations: EditorTranslation[];
}

/**
 * Отображает состояние переводов статьи по всем локалям редактора.
 *
 * @param props Список переводов статьи.
 * @returns Блок статусов переводов.
 */
export const BlogEditorTranslationStatus = ({ translations }: BlogEditorTranslationStatusProps) => {
  const tBlog = useTranslations('Admin.blog');
  const tSidebar = useTranslations('Admin.blog.editor.sidebar');

  return (
    <div className="space-y-3">
      {translations.map(translation => (
        <div
          key={translation.locale}
          className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 p-2"
        >
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                translation.title
                  ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'
                  : 'bg-muted-foreground/30'
              }`}
            />
            <span>{tBlog(BLOG_EDITOR_LOCALE_MESSAGE_KEYS[translation.locale])}</span>
          </div>
          {translation.title ? (
            <Badge
              variant="outline"
              className="bg-green-600/5 text-[10px] font-bold uppercase text-green-600 border-green-600/20"
            >
              {tSidebar('translationReady')}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase text-muted-foreground/60"
            >
              {tSidebar('translationEmpty')}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
};
