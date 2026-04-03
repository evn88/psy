'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface Category {
  slug: string;
  name: Record<string, string>;
}

interface CategoryFilterProps {
  allLabel: string;
  categories: Category[];
  activeSlug: string | null;
  locale: string;
}

export function CategoryFilter({ allLabel, categories, activeSlug, locale }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }

    const query = params.toString();
    router.push(query ? `/blog?${query}` : '/blog');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleClick(null)}
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
          !activeSlug
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-foreground border-border hover:border-primary/50'
        )}
      >
        {allLabel}
      </button>
      {categories.map(cat => (
        <button
          key={cat.slug}
          type="button"
          onClick={() => handleClick(cat.slug)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
            activeSlug === cat.slug
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border hover:border-primary/50'
          )}
        >
          {cat.name[locale] ?? cat.name.ru ?? cat.slug}
        </button>
      ))}
    </div>
  );
}
