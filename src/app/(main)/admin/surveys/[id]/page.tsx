import { notFound } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { SurveyDetail } from '../_components/survey-detail';
import { BreadcrumbSetter } from '@/components/breadcrumb-setter';
import type { QuestionType, AssignmentStatus } from '@prisma/client';

interface SurveyDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Страница детального просмотра опроса в админке.
 * Содержит вопросы, назначения, результаты и комментарии.
 */
export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id } = await params;

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: 'asc' } },
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          result: {
            include: {
              comments: {
                include: { author: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  if (!survey) {
    notFound();
  }

  // Сбор всех пользователей
  const allUsers = await prisma.user.findMany({
    where: { role: { not: 'GUEST' } },
    select: { id: true, name: true, email: true }
  });

  const mappedQuestions = survey.questions.map(
    (q: { id: string; text: string; type: QuestionType; options: unknown; order: number }) => ({
      id: q.id,
      text: q.text,
      type: q.type as string,
      options: q.options as string[] | null,
      order: q.order
    })
  );

  const mappedAssignments = survey.assignments.map(
    (a: {
      id: string;
      status: AssignmentStatus;
      user: { id: string; name: string | null; email: string };
      result: {
        id: string;
        answers: unknown;
        completedAt: Date;
        comments: Array<{
          id: string;
          text: string;
          createdAt: Date;
          author: { name: string | null };
          isReadByAdmin: boolean;
        }>;
      } | null;
    }) => ({
      id: a.id,
      status: a.status as 'PENDING' | 'COMPLETED',
      user: a.user,
      result: a.result
        ? {
            id: a.result.id,
            answers: a.result.answers as Record<string, unknown>,
            completedAt: a.result.completedAt.toISOString(),
            comments: a.result.comments.map(
              (c: {
                id: string;
                text: string;
                createdAt: Date;
                author: { name: string | null };
                isReadByAdmin: boolean;
              }) => ({
                id: c.id,
                text: c.text,
                createdAt: c.createdAt.toISOString(),
                author: c.author,
                isNew: !c.isReadByAdmin
              })
            )
          }
        : null
    })
  );

  return (
    <>
      <BreadcrumbSetter segment={id} title={survey.title} />
      <SurveyDetail
        surveyId={survey.id}
        title={survey.title}
        description={survey.description}
        questions={mappedQuestions}
        assignments={mappedAssignments}
        allUsers={allUsers}
      />
    </>
  );
}
