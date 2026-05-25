import { getTranslations } from 'next-intl/server';
import { MyDocuments } from './_components/my-documents';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from '@/i18n/navigation';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';

interface MyDocumentsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Страница "Файлы и документы".
 * Отображает список загруженных пользователем файлов и позволяет загружать новые.
 */
export default async function MyDocumentsPage({ params }: MyDocumentsPageProps) {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const t = await getTranslations('My');
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: '/auth', locale: currentLocale });
  }

  const userId = session!.user!.id!;

  // Получаем список документов пользователя
  const documents = await prisma.clientDocument.findMany({
    where: { userId },
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
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('dataTitle')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('dataDescription')}</p>
      </div>

      <MyDocuments userId={userId} documents={documents} />
    </div>
  );
}
