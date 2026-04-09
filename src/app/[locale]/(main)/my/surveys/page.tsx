import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
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

/**
 * Страница "Анкеты и тесты" в личном кабинете.
 * Здесь собрана первичная анкета и все назначенные психологические тесты/опросы.
 */
export default async function MySurveysPage() {
  const session = await auth();
  const t = await getTranslations('Surveys');
  const ti = await getTranslations('IntakeWizard');

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const userId = session.user.id;

  // 1. Получаем историю первичных анкет (Intake)
  const intakeHistory = await prisma.intakeResponse.findMany({
    where: {
      clientProfile: {
        userId: userId
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
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          {t('myTitle')}
        </h2>
        <p className="text-muted-foreground text-lg">
          Все ваши анкеты, психологические тесты и опросники в одном месте
        </p>
      </div>

      {/* Секция 1: Первичная анкета (Intake) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Первичная анкета</h3>
        </div>

        <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/20 transition-all shadow-md hover:shadow-xl bg-gradient-to-br from-background to-primary/5">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <FileQuestion className="h-24 w-24" />
          </div>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">{ti('title')}</CardTitle>
            <CardDescription className="text-base max-w-2xl leading-relaxed">
              Заполнение этой анкеты — самый важный этап подготовки к нашей работе. Она помогает мне
              заранее понять ваш запрос и подготовиться к первой сессии.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            {!latestIntake ? (
              <IntakeWizardModal triggerText="Заполнить первичную анкету" />
            ) : (
              <>
                <IntakeResultsModal
                  intakeId={latestIntake.id}
                  completedAt={latestIntake.createdAt}
                />
                <IntakeWizardModal triggerText="Заполнить заново" />
                <p className="text-sm text-muted-foreground w-full sm:w-auto italic">
                  Последний раз заполнено: {latestIntake.createdAt.toLocaleDateString('ru-RU')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Секция 2: Назначенные тесты и опросники */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Психологические тесты и задания</h3>
        </div>

        {assignments.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-16 w-16 text-muted-foreground/30 mb-6" />
              <p className="text-muted-foreground text-lg max-w-sm">{t('noSurveys')}</p>
              <p className="text-sm text-muted-foreground/60 mt-2">
                Дополнительные тесты появятся здесь после обсуждения на консультации
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {assignments.map(assignment => (
              <Card
                key={assignment.id}
                className="group relative flex flex-col hover:border-primary/40 transition-all hover:shadow-lg overflow-hidden"
              >
                <div
                  className={`absolute top-0 left-0 w-1 h-full transition-all ${assignment.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-orange-500'}`}
                />
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
                            Новое сообщение
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {assignment.survey.title}
                      </CardTitle>
                      {assignment.survey.description && (
                        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
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
                            ? new Date(assignment.result.completedAt).toLocaleDateString('ru-RU')
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
