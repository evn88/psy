'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import '@/styles/blog-article.css';

interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  return (
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
  );
}
