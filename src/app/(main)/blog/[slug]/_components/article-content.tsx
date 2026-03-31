import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@/styles/blog-article.css';

interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div className="blog-article">
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
