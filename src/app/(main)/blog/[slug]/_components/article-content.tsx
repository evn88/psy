'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import '@/styles/blog-article.css';

interface ArticleContentProps {
  content: string;
  showThemeToggle?: boolean;
}

export function ArticleContent({ content, showThemeToggle = false }: ArticleContentProps) {
  const { resolvedTheme } = useTheme();
  // Локальное переопределение темы (если пользователь нажал кнопку переключения)
  const [localDark, setLocalDark] = useState<boolean | null>(null);

  // Итоговая тема: либо локальное переопределение, либо системная тема сайта
  const dark = localDark ?? resolvedTheme === 'dark';

  return (
    <div className="relative">
      {showThemeToggle && (
        <button
          type="button"
          onClick={() => setLocalDark(!dark)}
          className={cn(
            'absolute top-0 right-0 p-2 rounded-full transition-colors',
            dark
              ? 'text-white/50 hover:text-white hover:bg-white/10'
              : 'text-foreground/40 hover:text-foreground hover:bg-muted'
          )}
          title={dark ? 'Светлая тема' : 'Тёмная тема'}
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      )}
      <div className={cn('blog-article', dark && 'dark')}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ src, alt }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ''} loading="lazy" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
