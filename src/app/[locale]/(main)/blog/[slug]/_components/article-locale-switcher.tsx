'use client';

import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface ArticleLocaleSwitcherProps {
  slug: string;
  availableLocales: string[];
  currentLocale: string;
}

export function ArticleLocaleSwitcher({
  slug,
  availableLocales,
  currentLocale
}: ArticleLocaleSwitcherProps) {
  const router = useRouter();

  if (availableLocales.length <= 1) return null;

  return (
    <div className="flex gap-1 ml-auto">
      {availableLocales.map(loc => (
        <button
          key={loc}
          type="button"
          onClick={() => router.push(`/blog/${slug}`, { locale: loc })}
          className={cn(
            'text-xs px-2 py-0.5 rounded border transition-colors',
            loc === currentLocale
              ? 'bg-[#900A0B] text-white border-[#900A0B]'
              : 'text-muted-foreground border-border hover:border-[#900A0B]/50 hover:text-foreground'
          )}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
