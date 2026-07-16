import { auth } from '@/auth';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { IntakeWizardModal } from './_components/intake-wizard';
import { IntakeResultsModal } from './_components/intake-results-modal';
import { SurveysTabs } from './_components/surveys-tabs';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';
import { getIntakeFormDefinition } from '@/modules/intake/form-definition.server';

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
  const hasIntake = !!latestIntake;
  const intakeDefinition = await getIntakeFormDefinition(currentLocale);

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

  // Фильтруем тесты по статусам
  const pendingAssignments = assignments.filter(a => a.status === 'PENDING');
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Premium Hero-блок */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('myTitle')}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('myDescription')}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <ClipboardList className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <SurveysTabs>
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none border-b-0">
            <TabsTrigger
              value="intakes"
              className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium bg-transparent shadow-none data-[state=active]:border-primary data-[state=active]:text-primary transition-all"
            >
              Анкеты
              {!hasIntake && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
                  1
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="tests"
              className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium bg-transparent shadow-none data-[state=active]:border-primary data-[state=active]:text-primary transition-all"
            >
              Тесты
              {pendingAssignments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
                  {pendingAssignments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Вкладка: Анкеты */}
        <TabsContent value="intakes" className="space-y-8 outline-none">
          <div className="space-y-4">{renderIntakeCard()}</div>
        </TabsContent>

        {/* Вкладка: Тесты */}
        <TabsContent value="tests" className="space-y-8 outline-none">
          {pendingAssignments.length > 0 ? (
            <div className="space-y-4">{renderAssignmentsGrid(pendingAssignments)}</div>
          ) : (
            renderEmptyState()
          )}

          {completedAssignments.length > 0 && (
            <div className="space-y-4 pt-4 mt-8 border-t border-border/40">
              <h3 className="text-base font-bold text-muted-foreground/80 tracking-tight px-1">
                Пройденные тесты
              </h3>
              {renderAssignmentsGrid(completedAssignments)}
            </div>
          )}
        </TabsContent>
      </SurveysTabs>
    </div>
  );

  function renderIntakeCard() {
    return (
      <Card className="relative overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                {ti('title')}
                {hasIntake && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Заполнено
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed max-w-3xl text-muted-foreground/90">
                {t('intakeDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-6 pb-6">
          {!latestIntake ? (
            <div className="pt-2">
              <div className="[&>button]:h-10 [&>button]:px-6">
                <IntakeWizardModal
                  definition={intakeDefinition}
                  locale={currentLocale}
                  triggerText={t('fillIntakeButton')}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 pt-4 border-t border-primary/10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary/70" />
                <span>
                  {t('lastFilledLabel', {
                    date: latestIntake.createdAt.toLocaleDateString(
                      currentLocale === 'en' ? 'en-US' : currentLocale === 'sr' ? 'sr-RS' : 'ru-RU',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )
                  })}
                </span>
              </div>
              {/* Обертка для кнопок, чтобы они имели одинаковую высоту h-10 */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto [&_button]:h-10 [&_button]:!h-10 [&_button]:!py-0">
                <IntakeResultsModal
                  key={latestIntake.id}
                  intakeId={latestIntake.id}
                  completedAt={latestIntake.createdAt}
                />
                <IntakeWizardModal
                  definition={intakeDefinition}
                  locale={currentLocale}
                  triggerText={t('refillIntakeButton')}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderEmptyState() {
    return (
      <Card className="border-dashed bg-muted/10 shadow-none rounded-xl">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted/40 mb-4 text-muted-foreground/40">
            <ClipboardList className="h-10 w-10" />
          </div>
          <p className="text-foreground font-bold text-base max-w-sm">{t('noSurveys')}</p>
          <p className="text-sm text-muted-foreground max-w-xs mt-1.5 leading-relaxed">
            {t('noTestsDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  function renderAssignmentsGrid(items: AssignmentWithSurvey[]) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {items.map(assignment => {
          const isCompleted = assignment.status === 'COMPLETED';
          const hasNewMessages = (assignment.result?._count?.comments ?? 0) > 0;

          return (
            <Card
              key={assignment.id}
              className={cn(
                'group relative flex flex-col transition-all duration-300 shadow-sm rounded-xl overflow-hidden border hover:-translate-y-1 hover:shadow-md',
                isCompleted
                  ? 'bg-gradient-to-br from-emerald-500/5 via-card to-card border-emerald-500/10 hover:border-emerald-500/30'
                  : 'bg-gradient-to-br from-orange-500/5 via-card to-card border-orange-500/10 hover:border-orange-500/30'
              )}
            >
              <CardHeader className="pb-4">
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-medium text-[11px] px-2 py-0.5 border bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {t('completed')}
                              {assignment.result?.completedAt && (
                                <>
                                  {` `}
                                  {new Date(assignment.result.completedAt).toLocaleDateString(
                                    currentLocale === 'en'
                                      ? 'en-US'
                                      : currentLocale === 'sr'
                                        ? 'sr-RS'
                                        : 'ru-RU',
                                    { day: 'numeric', month: 'short' }
                                  )}
                                </>
                              )}
                            </span>
                          </span>
                        </Badge>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="font-medium text-[11px] px-2 py-0.5 border bg-orange-500/10 text-orange-600 border-orange-500/20"
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('pending')}
                        </span>
                      </Badge>
                    )}

                    {hasNewMessages && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 animate-pulse font-bold"
                      >
                        <MessageSquare className="h-2.5 w-2.5 fill-current" />
                        {t('newMessageBadge')}
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-bold group-hover:text-primary transition-colors duration-250 leading-snug">
                    {assignment.survey.title}
                  </CardTitle>

                  {assignment.survey.description && (
                    <CardDescription className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
                      {assignment.survey.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              <CardContent className="mt-auto px-6 pb-6 pt-4 border-t bg-muted/10 group-hover:bg-muted/20 transition-colors duration-300">
                {!isCompleted ? (
                  <Button
                    asChild
                    className="w-full h-10 rounded-lg group/btn shadow-sm font-semibold transition-all"
                  >
                    <Link
                      href={`/my/surveys/${assignment.id}`}
                      className="flex items-center justify-center gap-2"
                    >
                      {t('startSurvey')}
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-10 rounded-lg group/btn text-xs font-semibold hover:bg-background shadow-sm"
                  >
                    <Link
                      href={`/my/surveys/${assignment.id}`}
                      className="flex items-center justify-center gap-1.5"
                    >
                      {t('viewResults')}
                      <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
}
