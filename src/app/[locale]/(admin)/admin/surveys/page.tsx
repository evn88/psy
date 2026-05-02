import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SurveysTable } from './_components/SurveysTable';

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
 * Отображает таблицу с поиском и быстрой навигацией.
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

  // Маппинг данных для клиентского компонента
  const rows = surveys.map(survey => ({
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questionsCount: survey._count.questions,
    assignmentsCount: survey._count.assignments,
    createdByName: survey.createdBy.name || 'Admin',
    createdAt: survey.createdAt.toISOString(),
    hasUnreadMessages: survey.assignments.some(a => (a.result?._count?.comments ?? 0) > 0)
  }));

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('totalSurveys', { count: surveys.length })}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/admin/surveys/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('createSurvey')}
          </Link>
        </Button>
      </div>

      {/* Таблица опросов */}
      <SurveysTable surveys={rows} />
    </div>
  );
}
