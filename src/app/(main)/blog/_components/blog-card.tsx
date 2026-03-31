import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBlogDate } from '@/shared/lib/blog-utils';

interface BlogCardProps {
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  readingTime: number;
  publishedAt: Date | null;
  author: { name: string | null } | null;
  categories: { slug: string; name: Record<string, string> }[];
  locale: string;
}

export function BlogCard({
  slug,
  title,
  description,
  coverImage,
  readingTime,
  publishedAt,
  author,
  categories,
  locale
}: BlogCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
    >
      {/* Обложка */}
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Категории */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <Badge key={cat.slug} variant="secondary" className="text-xs">
                {cat.name[locale] ?? cat.name.ru ?? cat.slug}
              </Badge>
            ))}
          </div>
        )}

        {/* Заголовок */}
        <h2 className="font-bold text-foreground text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h2>

        {/* Описание — flex-1 на обёртке, line-clamp на параграфе, иначе конфликт в flexbox */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
          )}
        </div>

        {/* Мета */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            {publishedAt && <span>{formatBlogDate(publishedAt, locale)}</span>}
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {readingTime} мин
            </span>
          </div>
          {author?.name && <span className="truncate max-w-[120px]">{author.name}</span>}
        </div>
      </div>
    </Link>
  );
}
