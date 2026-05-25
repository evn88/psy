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
  UserRound,
  Sparkles
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
    tone === 'accent'
      ? 'bg-primary text-primary-foreground shadow-inner'
      : 'bg-primary/10 text-primary';

  return (
    <Card
      className={cn(
        'shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-border/60 rounded-xl overflow-hidden',
        tone === 'accent' && 'bg-gradient-to-br from-primary/5 via-card to-card border-primary/20'
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </CardTitle>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 shrink-0',
            iconClassName
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const MyActionCard = ({ href, title, description, icon: Icon }: MyActionCardProps) => (
  <Button
    asChild
    variant="outline"
    className="group h-auto w-full justify-between whitespace-normal p-4 rounded-xl border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 hover:bg-primary/5"
  >
    <Link href={href} className="flex w-full items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-foreground/90">{title}</span>
        <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground/80">
          {description}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
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
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Premium Hero-блок */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t('dashboardTitle')}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('dashboardGreeting', { name: user.name || '' })}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('dashboardSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl text-xs font-semibold shadow-sm hover:bg-background"
            >
              <Link href="/my/sessions">{t('openSessions')}</Link>
            </Button>
            <Button asChild className="h-10 px-4 rounded-xl text-xs font-semibold shadow-md">
              <Link href="/my/surveys">{t('openSurveys')}</Link>
            </Button>
          </div>
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
        <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b bg-muted/5 pb-4">
            <CardTitle className="text-lg font-bold">{t('nextStepsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 p-5 sm:p-6">
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
          <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b bg-muted/5 pb-4">
              <CardTitle className="text-base font-bold">{t('accountOverviewTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="rounded-xl border border-border/60 bg-muted/10 p-3 shadow-inner">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                  {t('profileLabel')}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/90 truncate">
                  {user.name || user.email}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/10 p-3 shadow-inner">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                  {t('timezoneLabel')}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/90">{userTimezone}</div>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-xl font-semibold shadow-sm hover:bg-background"
              >
                <Link href="/my/profile">
                  <UserRound className="h-4 w-4 mr-2 text-muted-foreground/70" />
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
