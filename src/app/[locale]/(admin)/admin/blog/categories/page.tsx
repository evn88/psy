import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { CategoriesManager } from './_components/CategoriesManager';

export const dynamic = 'force-dynamic';

interface Category {
  id: string;
  slug: string;
  name: { ru: string; en?: string; sr?: string };
  postsCount: number;
  posts: { postId: string }[];
}

export default async function AdminCategoriesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/admin');
  }

  const categories = await prisma.blogCategory.findMany({
    orderBy: { createdAt: 'asc' },
    include: { posts: { select: { postId: true } } }
  });

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Категории блога</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Управление категориями для фильтрации статей
        </p>
      </div>
      <CategoriesManager
        initialCategories={categories.map((c: Category) => ({
          id: c.id,
          slug: c.slug,
          name: c.name as { ru: string; en?: string; sr?: string },
          postsCount: c.posts.length
        }))}
      />
    </div>
  );
}
