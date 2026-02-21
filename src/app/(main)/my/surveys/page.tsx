import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type AssignmentWithSurvey = Prisma.SurveyAssignmentGetPayload<{
  include: { survey: true; result: true };
}>;

/**
 * Страница списка назначенных опросов пользователя.
 * Отображает статус каждого опроса (ожидает/пройден).
 */
export default async function MySurveysPage() {
  const session = await auth();
  const t = await getTranslations('Surveys');

  if (!session?.user) {
    redirect('/auth');
  }

  const assignments: AssignmentWithSurvey[] = await prisma.surveyAssignment.findMany({
    where: { userId: session.user.id },
    include: {
      survey: true,
      result: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('myTitle')}</h2>

      {assignments.length === 0 ? (
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noSurveys')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {assignments.map(assignment => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg truncate">{assignment.survey.title}</CardTitle>
                    {assignment.survey.description && (
                      <CardDescription className="line-clamp-2">
                        {assignment.survey.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant={assignment.status === 'COMPLETED' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {assignment.status === 'COMPLETED' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('completed')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t('pending')}
                      </span>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {assignment.status === 'PENDING' ? (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={`/my/surveys/${assignment.id}`}>{t('startSurvey')}</Link>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('completedAt', {
                      date: assignment.result?.completedAt
                        ? new Date(assignment.result.completedAt).toLocaleDateString('ru-RU')
                        : ''
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
