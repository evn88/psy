import { getTranslations } from 'next-intl/server';
import { MyDocuments } from './_components/my-documents';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { redirect } from 'next/navigation';

/**
 * Страница "Файлы и документы".
 * Отображает список загруженных пользователем файлов и позволяет загружать новые.
 */
export default async function MyDocumentsPage() {
  const t = await getTranslations('My');
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth');
  }

  // Получаем список документов пользователя
  const documents = await prisma.clientDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      fileType: true,
      size: true,
      createdAt: true,
      uploadedById: true
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('dataTitle')}</h2>
        <p className="text-muted-foreground">
          Список ваших файлов и документов, которыми вы поделились со специалистом
        </p>
      </div>

      <div className="max-w-4xl">
        <MyDocuments userId={session.user.id} documents={documents} />
      </div>
    </div>
  );
}
