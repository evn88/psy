import { auth } from '@/auth';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Sparkles,
  ArrowRight,
  MessageSquare,
  FileQuestion,
  GraduationCap
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { IntakeWizardModal } from './_components/intake-wizard';
import { IntakeResultsModal } from './_components/intake-results-modal';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';

type AssignmentWithSurvey = Prisma.SurveyAssignmentGetPayload<{
  include: {
    survey: true;
    result: {
      include: {
        _count: {
          select: {
            comments: {
              where: { isReadByUser: false };
            };
          };
        };
      };
    };
  };
}>;

interface MySurveysPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Страница "Анкеты и тесты" в личном кабинете.
 * Здесь собрана первичная анкета и все назначенные психологические тесты/опросы.
 */
export default async function MySurveysPage({ params }: MySurveysPageProps) {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const t = await getTranslations('Surveys');
  const ti = await getTranslations('IntakeWizard');

  if (!session?.user?.id) {
    redirect({ href: '/auth', locale: currentLocale });
  }

  const userId = session!.user!.id!;

  // 1. Получаем историю первичных анкет (Intake)
  const intakeHistory = await prisma.intakeResponse.findMany({
    where: {
      clientProfile: {
        userId
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const latestIntake = intakeHistory[0];

  // 2. Получаем назначенные опросы/тесты
  const assignments: AssignmentWithSurvey[] = await prisma.surveyAssignment.findMany({
    where: { userId: userId },
    include: {
      survey: true,
      result: {
        include: {
          _count: {
            select: {
              comments: {
                where: { isReadByUser: false }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('myTitle')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('myDescription')}</p>
      </div>

      {/* Секция 1: Первичная анкета (Intake) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{t('intakeSectionTitle')}</h2>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{ti('title')}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t('intakeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            {!latestIntake ? (
              <IntakeWizardModal triggerText={t('fillIntakeButton')} />
            ) : (
              <>
                <IntakeResultsModal
                  intakeId={latestIntake.id}
                  completedAt={latestIntake.createdAt}
                />
                <IntakeWizardModal triggerText={t('refillIntakeButton')} />
                <p className="text-sm text-muted-foreground w-full sm:w-auto">
                  {t('lastFilledLabel', {
                    date: latestIntake.createdAt.toLocaleDateString(
                      currentLocale === 'en' ? 'en-US' : currentLocale === 'sr' ? 'sr-RS' : 'ru-RU'
                    )
                  })}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Секция 2: Назначенные тесты и опросники */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
            <GraduationCap className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{t('testsSectionTitle')}</h2>
        </div>

        {assignments.length === 0 ? (
          <Card className="border-dashed bg-muted/20 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-base max-w-sm">{t('noSurveys')}</p>
              <p className="text-sm text-muted-foreground/60 mt-2">{t('noTestsDescription')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assignments.map(assignment => (
              <Card
                key={assignment.id}
                className={cn(
                  'group relative flex flex-col transition-all duration-250 shadow-sm rounded-xl overflow-hidden border border-border/60 hover:shadow-md hover:border-primary/40',
                  assignment.status === 'COMPLETED'
                    ? 'bg-gradient-to-br from-emerald-500/5 via-card to-card border-emerald-500/20'
                    : 'bg-gradient-to-br from-orange-500/5 via-card to-card border-orange-500/20'
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={assignment.status === 'COMPLETED' ? 'secondary' : 'default'}
                          className="font-medium"
                        >
                          {assignment.status === 'COMPLETED' ? (
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('completed')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {t('pending')}
                            </span>
                          )}
                        </Badge>
                        {(assignment.result?._count?.comments ?? 0) > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3 fill-current" />
                            {t('newMessageBadge')}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {assignment.survey.title}
                      </CardTitle>
                      {assignment.survey.description && (
                        <CardDescription className="line-clamp-2 text-sm">
                          {assignment.survey.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-4 flex items-center justify-between border-t bg-muted/5">
                  {assignment.status === 'PENDING' ? (
                    <Button asChild className="w-full sm:w-auto group/btn">
                      <Link
                        href={`/my/surveys/${assignment.id}`}
                        className="flex items-center gap-2"
                      >
                        {t('startSurvey')}
                        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  ) : (
                    <div className="flex w-full items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t('completedAt', {
                          date: assignment.result?.completedAt
                            ? new Date(assignment.result.completedAt).toLocaleDateString(
                                currentLocale === 'en'
                                  ? 'en-US'
                                  : currentLocale === 'sr'
                                    ? 'sr-RS'
                                    : 'ru-RU'
                              )
                            : ''
                        })}
                      </p>
                      <Button asChild variant="outline" className="group/btn">
                        <Link
                          href={`/my/surveys/${assignment.id}`}
                          className="flex items-center gap-2"
                        >
                          {t('viewResults')}
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
