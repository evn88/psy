import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Calendar } from 'lucide-react';
import prisma from '@/shared/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { formatBlogDate, getBlogLocale } from '@/shared/lib/blog-utils';
import { ArticleContent } from './_components/article-content';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function BlogArticlePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE')?.value ?? 'ru';

  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      translations: true,
      categories: { include: { category: { select: { slug: true, name: true } } } },
      author: { select: { name: true, image: true } }
    }
  });

  if (!post) notFound();

  const availableLocales = post.translations
    .filter((t: { title: string | null }) => t.title)
    .map((t: { locale: string }) => t.locale);
  const baseLocale = getBlogLocale(rawLocale, availableLocales);
  // ?lang=en переопределяет локаль только для этой страницы
  const locale = lang && availableLocales.includes(lang) ? lang : baseLocale;

  const translation =
    post.translations.find((t: { locale: string }) => t.locale === locale) ??
    post.translations.find((t: { locale: string }) => t.locale === 'ru') ??
    post.translations[0];

  if (!translation) notFound();

  const categories = post.categories.map((c: { category: { slug: string; name: unknown } }) => ({
    slug: c.category.slug,
    name: c.category.name as Record<string, string>
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Обложка */}
      {post.coverImage && (
        <div className="relative w-full aspect-[3/1] max-h-[420px] bg-[#03070A] overflow-hidden">
          <Image
            src={post.coverImage}
            alt={translation.title}
            fill
            className="object-cover opacity-80"
            priority
            sizes="100vw"
          />
        </div>
      )}

      <div className={`max-w-3xl mx-auto px-4 pb-12 ${post.coverImage ? 'pt-8' : 'pt-8'}`}>
        {/* Категории */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat: { slug: string; name: Record<string, string> }) => (
              <Link key={cat.slug} href={`/blog?category=${cat.slug}`}>
                <Badge
                  variant="secondary"
                  className="hover:bg-[#900A0B]/10 hover:text-[#900A0B] cursor-pointer"
                >
                  {cat.name[locale] ?? cat.name.ru ?? cat.slug}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Заголовок */}
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
          {translation.title}
        </h1>

        {/* Мета */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
          {post.author?.name && (
            <span className="font-medium text-foreground">{post.author.name}</span>
          )}
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatBlogDate(post.publishedAt, locale)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {post.readingTime} мин чтения
          </span>
        </div>

        {/* Контент статьи */}
        <ArticleContent content={translation.content} />
      </div>
    </div>
  );
}
