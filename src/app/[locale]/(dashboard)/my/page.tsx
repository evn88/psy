import { type ComponentType } from 'react';
import Link from 'next/link';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  UserRound
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, ru } from 'date-fns/locale';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';

import { cn } from '@/lib/utils';

interface MyDashboardPageProps {
  params: Promise<{ locale: string }>;
}

interface MyStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent';
}

interface MyActionCardProps {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const MyStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default'
}: MyStatCardProps) => {
  const iconClassName =
    tone === 'accent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground';

  return (
    <Card
      className={cn(
        'shadow-sm transition-all duration-250 hover:shadow-md border-border/60 rounded-xl overflow-hidden',
        tone === 'accent' && 'bg-gradient-to-br from-primary/8 via-card to-card border-primary/30'
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
            iconClassName
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const MyActionCard = ({ href, title, description, icon: Icon }: MyActionCardProps) => (
  <Button
    asChild
    variant="outline"
    className="group h-auto w-full justify-between whitespace-normal p-4 rounded-xl border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-primary/40 hover:bg-accent/10"
  >
    <Link href={href} className="flex w-full items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/20 group-hover:text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs font-normal leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  </Button>
);

/**
 * Дашборд личного кабинета пользователя.
 * Отображает приветствие и виджет-пример со статистикой.
 * GUEST перенаправляется на /my/profile.
 */
export default async function MyDashboardPage({ params }: MyDashboardPageProps) {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const t = await getTranslations('My');
  const user = requireAuthenticatedUser(session?.user, currentLocale);

  // GUEST не имеет доступа к дашборду
  if (user.role === 'GUEST') {
    redirect({ href: '/my/profile', locale: currentLocale });
  }

  const now = new Date();

  const [pendingSurveys, completedSurveys, nextSession, dbUser] = await Promise.all([
    prisma.surveyAssignment.count({
      where: {
        userId: user.id,
        status: 'PENDING'
      }
    }),
    prisma.surveyAssignment.count({
      where: {
        userId: user.id,
        status: 'COMPLETED'
      }
    }),
    prisma.event.findFirst({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'PENDING_CONFIRMATION'] },
        start: {
          gte: now
        }
      },
      orderBy: {
        start: 'asc'
      }
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { timezone: true, language: true }
    })
  ]);

  const userTimezone = dbUser?.timezone || 'UTC';
  const userLocale = dbUser?.language === 'en' ? enUS : ru;

  const formattedNextSession = nextSession
    ? formatInTimeZone(nextSession.start, userTimezone, 'd MMM, HH:mm', { locale: userLocale })
    : '—';
  const nextSessionDescription = nextSession
    ? nextSession.title ||
      (userLocale === ru ? 'Консультация запланирована' : 'Consultation scheduled')
    : t('nextSessionDesc');

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('dashboardGreeting', { name: user.name || '' })}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/my/sessions">{t('openSessions')}</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/my/surveys">{t('openSurveys')}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MyStatCard
          title={t('pendingSurveys')}
          value={pendingSurveys}
          description={t('pendingSurveysDesc')}
          icon={ClipboardList}
          tone={pendingSurveys > 0 ? 'accent' : 'default'}
        />
        <MyStatCard
          title={t('nextSession')}
          value={formattedNextSession}
          description={nextSessionDescription}
          icon={CalendarDays}
          tone={nextSession ? 'accent' : 'default'}
        />
        <MyStatCard
          title={t('completedSurveys')}
          value={completedSurveys}
          description={t('completedSurveysDesc')}
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t('nextStepsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MyActionCard
              href="/my/surveys"
              title={t('actionSurveysTitle')}
              description={t('actionSurveysDesc')}
              icon={ClipboardList}
            />
            <MyActionCard
              href="/my/sessions"
              title={t('actionSessionsTitle')}
              description={t('actionSessionsDesc')}
              icon={CalendarDays}
            />
            <MyActionCard
              href="/my/payments"
              title={t('actionPaymentsTitle')}
              description={t('actionPaymentsDesc')}
              icon={CreditCard}
            />
            <MyActionCard
              href="/my/data"
              title={t('actionDataTitle')}
              description={t('actionDataDesc')}
              icon={FileText}
            />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('accountOverviewTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {t('profileLabel')}
                </div>
                <div className="mt-1 text-sm font-medium">{user.name || user.email}</div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {t('timezoneLabel')}
                </div>
                <div className="mt-1 text-sm font-medium">{userTimezone}</div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/my/profile">
                  <UserRound className="h-4 w-4" />
                  {t('editProfile')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
