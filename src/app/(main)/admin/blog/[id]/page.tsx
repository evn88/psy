import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { BlogEditorForm } from './_components/blog-editor-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminBlogEditPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    notFound();
  }

  const [post, categories] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: {
        translations: true,
        categories: { include: { category: true } }
      }
    }),
    prisma.blogCategory.findMany({ orderBy: { createdAt: 'asc' } })
  ]);

  if (!post) notFound();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <BlogEditorForm
        postId={post.id}
        initialStatus={post.status}
        initialCoverImage={post.coverImage}
        initialTranslations={post.translations}
        initialCategoryIds={post.categories.map((c: { categoryId: string }) => c.categoryId)}
        allCategories={categories.map((c: { id: string; name: unknown }) => ({
          ...c,
          name: c.name as Record<string, string>
        }))}
      />
    </div>
  );
}
