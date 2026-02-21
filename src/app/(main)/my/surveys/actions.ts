'use server';

import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

/**
 * Отправляет ответы пользователя на опрос.
 * @param assignmentId - ID назначения опроса
 * @param answers - объект с ответами { questionId: answer }
 */
export const submitSurveyResult = async (
  assignmentId: string,
  answers: Record<string, unknown>
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Не авторизован' };
  }

  try {
    // Проверяем принадлежность назначения текущему пользователю
    const assignment = await prisma.surveyAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment || assignment.userId !== session.user.id) {
      return { error: 'Назначение не найдено' };
    }

    if (assignment.status === 'COMPLETED') {
      return { error: 'Опрос уже пройден' };
    }

    // Создаём результат и обновляем статус назначения
    await prisma.$transaction([
      prisma.surveyResult.create({
        data: {
          assignmentId,
          answers
        }
      }),
      prisma.surveyAssignment.update({
        where: { id: assignmentId },
        data: { status: 'COMPLETED' }
      })
    ]);

    revalidatePath('/my/surveys');
    return { success: true };
  } catch (error) {
    console.error('Ошибка сохранения результата опроса:', error);
    return { error: 'Не удалось сохранить результат' };
  }
};
