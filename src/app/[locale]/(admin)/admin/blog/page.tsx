import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { defaultLocale, locales } from '@/i18n/config';
import prisma from '@/lib/prisma';
import { Clock, Tag, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBlogDate } from '@/lib/blog-utils';
import { CreateArticleButton } from './_components/CreateArticleButton';
import { DeleteArticleButton } from './_components/DeleteArticleButton';
import { GoToCategoriesButton } from './_components/GoToCategoriesButton';

export const dynamic = 'force-dynamic';

interface AdminBlogTranslation {
  locale: string;
  title: string;
}

interface AdminBlogCategoryRecord {
  id: string;
  name: Record<string, string>;
}

interface AdminBlogPostRecord {
  id: string;
  status: 'DRAFT' | 'PUBLISHED';
  readingTime: number;
  publishedAt: Date | null;
  createdAt: Date;
  translations: AdminBlogTranslation[];
  categories: { category: AdminBlogCategoryRecord }[];
  author: { name: string | null } | null;
}

export default async function AdminBlogPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/admin');
  }

  const posts = (await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      translations: { select: { locale: true, title: true } },
      categories: { include: { category: { select: { id: true, name: true } } } },
      author: { select: { name: true } }
    }
  })) as AdminBlogPostRecord[];

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Управление блогом</h1>
          <p className="text-sm text-muted-foreground mt-1">{posts.length} статей</p>
        </div>
        <div className="flex items-center gap-2">
          <GoToCategoriesButton />
          <CreateArticleButton />
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-4">Статей пока нет</p>
          <CreateArticleButton />
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const defaultTranslation = post.translations.find(
              translation => translation.locale === defaultLocale
            );
            const title = defaultTranslation?.title || 'Без заголовка';
            const postCategories = post.categories.map(
              categoryRelation => categoryRelation.category.name.ru ?? categoryRelation.category.id
            );

            return (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="font-semibold text-foreground hover:text-[#900A0B] transition-colors truncate"
                    >
                      {title}
                    </Link>
                    <Badge
                      variant={post.status === 'PUBLISHED' ? 'default' : 'secondary'}
                      className={
                        post.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                      }
                    >
                      {post.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {post.author?.name && (
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {post.author.name}
                      </span>
                    )}
                    {post.publishedAt && <span>{formatBlogDate(post.publishedAt, 'ru')}</span>}
                    {!post.publishedAt && (
                      <span>Создано: {formatBlogDate(post.createdAt, 'ru')}</span>
                    )}
                    {postCategories.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="size-3" />
                        {postCategories.join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {post.readingTime} мин
                    </span>
                    {/* Флаги переводов */}
                    <span className="flex items-center gap-1">
                      {locales.map((locale: string) => {
                        const hasTranslation = post.translations.some(
                          (t: { locale: string }) => t.locale === locale
                        );
                        return (
                          <span
                            key={locale}
                            className={`text-xs px-1 rounded ${
                              hasTranslation
                                ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                                : 'text-muted-foreground/50'
                            }`}
                          >
                            {locale.toUpperCase()}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DeleteArticleButton postId={post.id} title={title} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
