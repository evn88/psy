import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { BlogAuthorOption } from './blog-editor-form.types';

interface BlogEditorAuthorSelectProps {
  authors: BlogAuthorOption[];
  value: string;
  onChange: (authorId: string) => void;
}

/**
 * Возвращает подпись автора для выпадающего списка.
 *
 * @param author Автор статьи.
 * @param fallbackLabel Резервная подпись при отсутствии имени и email.
 * @returns Текстовую подпись опции.
 */
const getAuthorOptionLabel = (author: BlogAuthorOption, fallbackLabel: string) => {
  if (author.name && author.email) {
    return `${author.name} (${author.email})`;
  }

  return author.name ?? author.email ?? fallbackLabel;
};

/**
 * Отображает селектор автора статьи.
 *
 * @param props Доступные авторы и текущее значение.
 * @returns Блок выбора автора.
 */
export const BlogEditorAuthorSelect = ({
  authors,
  value,
  onChange
}: BlogEditorAuthorSelectProps) => {
  const tFields = useTranslations('Admin.blog.editor.fields');

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        {tFields('authorLabel')}
      </p>
      {authors.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tFields('authorEmpty')}</p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder={tFields('authorPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {authors.map(author => (
              <SelectItem key={author.id} value={author.id}>
                {getAuthorOptionLabel(author, tFields('authorUnnamed'))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
