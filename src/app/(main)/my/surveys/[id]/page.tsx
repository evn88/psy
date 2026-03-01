import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { SurveyForm } from '../_components/survey-form';
import { SurveyResultDetail } from '../_components/survey-result-detail';
import { BreadcrumbSetter } from '@/components/breadcrumb-setter';
import type { QuestionType } from '@prisma/client';

interface SurveyPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Страница прохождения конкретного опроса или просмотра его результатов.
 * Если статус COMPLETED — показывает результаты и чат с администратором.
 * Если статус PENDING — показывает форму для заполнения.
 */
export default async function TakeSurveyPage({ params }: SurveyPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const assignment = await prisma.surveyAssignment.findUnique({
    where: { id },
    include: {
      survey: {
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      },
      result: {
        include: {
          comments: {
            include: {
              author: {
                select: { id: true, name: true, role: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      }
    }
  });

  if (!assignment || assignment.userId !== session.user.id) {
    notFound();
  }

  const mappedQuestions = assignment.survey.questions.map(
    (q: { id: string; text: string; type: QuestionType; options: unknown; order: number }) => ({
      id: q.id,
      text: q.text,
      type: q.type as string,
      options: q.options as string[] | null,
      order: q.order
    })
  );

  // Если опрос пройден, показываем страницу с результатами и комментариями
  if (assignment.status === 'COMPLETED' && assignment.result) {
    return (
      <>
        <BreadcrumbSetter segment={id} title={assignment.survey.title} />
        <SurveyResultDetail
          resultId={assignment.result.id}
          surveyTitle={assignment.survey.title}
          surveyDescription={assignment.survey.description}
          questions={mappedQuestions}
          answers={(assignment.result.answers ?? {}) as Record<string, unknown>}
          comments={assignment.result.comments.map(
            (c: {
              id: string;
              text: string;
              createdAt: Date;
              author: { id: string; name: string | null; role: string };
              isReadByUser: boolean;
            }) => ({
              id: c.id,
              text: c.text,
              createdAt: c.createdAt.toISOString(),
              author: c.author,
              isNew: !c.isReadByUser
            })
          )}
          currentUserId={session.user.id}
        />
      </>
    );
  }

  // В противном случае показываем форму для прохождения
  return (
    <>
      <BreadcrumbSetter segment={id} title={assignment.survey.title} />
      <SurveyForm
        assignmentId={assignment.id}
        surveyTitle={assignment.survey.title}
        surveyDescription={assignment.survey.description}
        questions={mappedQuestions}
      />
    </>
  );
}
