import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { SurveyForm } from '../_components/survey-form';
import type { QuestionType } from '@prisma/client';

interface SurveyPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Страница прохождения конкретного опроса.
 * Загружает назначение и вопросы, передаёт в SurveyForm.
 */
export default async function TakeSurveyPage({ params }: SurveyPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
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
      }
    }
  });

  if (!assignment || assignment.userId !== session.user.id) {
    notFound();
  }

  if (assignment.status === 'COMPLETED') {
    redirect('/my/surveys');
  }

  const mappedQuestions = assignment.survey.questions.map(
    (q: { id: string; text: string; type: QuestionType; options: unknown; order: number }) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options as string[] | null,
      order: q.order
    })
  );

  return (
    <SurveyForm
      assignmentId={assignment.id}
      surveyTitle={assignment.survey.title}
      surveyDescription={assignment.survey.description}
      questions={mappedQuestions}
    />
  );
}
