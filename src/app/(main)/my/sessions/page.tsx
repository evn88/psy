import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

/**
 * Страница-заглушка «Мои сессии».
 * Будет содержать расписание и возможность записи на приём.
 */
export default async function MySessionsPage() {
  const t = await getTranslations('My');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('sessionsTitle')}</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            {t('sessionsTitle')}
          </CardTitle>
          <CardDescription>{t('comingSoon')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('sessionsPlaceholder')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
