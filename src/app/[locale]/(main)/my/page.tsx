import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CalendarDays, ClipboardList } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, ru } from 'date-fns/locale';

/**
 * Дашборд личного кабинета пользователя.
 * Отображает приветствие и виджет-пример со статистикой.
 * GUEST перенаправляется на /my/profile.
 */
export default async function MyDashboardPage() {
  const session = await auth();
  const t = await getTranslations('My');

  if (!session?.user) {
    redirect('/auth');
  }

  // GUEST не имеет доступа к дашборду
  if (session.user.role === 'GUEST') {
    redirect('/my/profile');
  }

  // Статистика по опросам пользователя
  const pendingSurveys = await prisma.surveyAssignment.count({
    where: {
      userId: session.user.id,
      status: 'PENDING'
    }
  });

  const completedSurveys = await prisma.surveyAssignment.count({
    where: {
      userId: session.user.id,
      status: 'COMPLETED'
    }
  });

  // Получаем ближайшую сессию
  const nextSession = await prisma.event.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
      start: {
        gte: new Date()
      }
    },
    orderBy: {
      start: 'asc'
    }
  });

  // Получаем полные данные пользователя для timezone и language
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true, language: true }
  });

  const userTimezone = dbUser?.timezone || 'UTC';
  const userLocale = dbUser?.language === 'en' ? enUS : ru;

  const formattedNextSession = nextSession
    ? formatInTimeZone(nextSession.start, userTimezone, 'd MMM, HH:mm', { locale: userLocale })
    : '—';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('dashboardGreeting', { name: session.user.name || '' })}
        </h2>
        <p className="text-muted-foreground mt-1">{t('dashboardSubtitle')}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pendingSurveys')}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSurveys}</div>
            <p className="text-xs text-muted-foreground">{t('pendingSurveysDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('completedSurveys')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSurveys}</div>
            <p className="text-xs text-muted-foreground">{t('completedSurveysDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('nextSession')}</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedNextSession}</div>
            <p className="text-xs text-muted-foreground">
              {nextSession
                ? nextSession.title ||
                  (userLocale === ru ? 'Консультация запланирована' : 'Consultation scheduled')
                : t('nextSessionDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
