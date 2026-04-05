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
 * @returns Текстовую подпись опции.
 */
const getAuthorOptionLabel = (author: BlogAuthorOption) => {
  if (author.name && author.email) {
    return `${author.name} (${author.email})`;
  }

  return author.name ?? author.email ?? 'Без имени';
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
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        Автор
      </p>
      {authors.length === 0 ? (
        <p className="text-xs text-muted-foreground">Нет доступных авторов.</p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Выберите автора" />
          </SelectTrigger>
          <SelectContent>
            {authors.map(author => (
              <SelectItem key={author.id} value={author.id}>
                {getAuthorOptionLabel(author)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
