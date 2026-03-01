import prisma from '@/shared/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type SurveyWithCounts = Prisma.SurveyGetPayload<{
  include: {
    _count: { select: { assignments: true; questions: true } };
    createdBy: { select: { name: true } };
    assignments: {
      select: {
        result: {
          select: {
            _count: {
              select: {
                comments: {
                  where: { isReadByAdmin: false };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * Страница списка опросов в админке.
 * Отображает все созданные опросы со счётчиком назначений.
 */
export default async function AdminSurveysPage() {
  const t = await getTranslations('AdminSurveys');

  const surveys: SurveyWithCounts[] = await prisma.survey.findMany({
    include: {
      _count: { select: { assignments: true, questions: true } },
      createdBy: { select: { name: true } },
      assignments: {
        select: {
          result: {
            select: {
              _count: {
                select: {
                  comments: {
                    where: { isReadByAdmin: false }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
        <Button asChild>
          <Link href="/admin/surveys/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('createSurvey')}
          </Link>
        </Button>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noSurveys')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map(survey => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 w-full sm:w-auto">
                    <CardTitle className="text-lg truncate">{survey.title}</CardTitle>
                    {survey.description && (
                      <CardDescription className="line-clamp-2">
                        {survey.description}
                      </CardDescription>
                    )}
                  </div>
                  {survey.assignments.some(a => (a.result?._count?.comments ?? 0) > 0) && (
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 flex-wrap">
                      <Badge variant="destructive" className="shrink-0 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Новое сообщение
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {t('questionsCount', { count: survey._count.questions })}
                  </Badge>
                  <Badge variant="secondary">
                    {t('assignmentsCount', { count: survey._count.assignments })}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('createdBy', { name: survey.createdBy.name || 'Admin' })}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/admin/surveys/${survey.id}`}>{t('manage')}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
