import { getTranslations } from 'next-intl/server';
import { MyDocuments } from './_components/my-documents';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from '@/i18n/navigation';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { FileText, Sparkles } from 'lucide-react';

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
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Premium Hero-блок */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('dataTitle')}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Файлы и документы</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('dataDescription')}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <FileText className="h-7 w-7" />
          </div>
        </div>
      </div>

      <MyDocuments userId={userId} documents={documents} />
    </div>
  );
}
