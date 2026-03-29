'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Category {
  slug: string;
  name: Record<string, string>;
}

interface CategoryFilterProps {
  categories: Category[];
  activeSlug: string | null;
  locale: string;
}

export function CategoryFilter({ categories, activeSlug, locale }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.push(`/blog?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleClick(null)}
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
          !activeSlug
            ? 'bg-[#900A0B] text-white border-[#900A0B]'
            : 'bg-background text-foreground border-border hover:border-[#900A0B]/50'
        )}
      >
        Все
      </button>
      {categories.map(cat => (
        <button
          key={cat.slug}
          type="button"
          onClick={() => handleClick(cat.slug)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
            activeSlug === cat.slug
              ? 'bg-[#900A0B] text-white border-[#900A0B]'
              : 'bg-background text-foreground border-border hover:border-[#900A0B]/50'
          )}
        >
          {cat.name[locale] ?? cat.name.ru ?? cat.slug}
        </button>
      ))}
    </div>
  );
}
