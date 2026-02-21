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

/**
 * Добавляет комментарий пользователя к результату своего опроса.
 * @param resultId - ID результата
 * @param text - текст комментария
 */
export const addResultComment = async (resultId: string, text: string) => {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Не авторизован' };
  }

  try {
    // Проверяем принадлежность результата текущему пользователю через назначение
    const result = await prisma.surveyResult.findUnique({
      where: { id: resultId },
      include: {
        assignment: { select: { userId: true } }
      }
    });

    if (!result || result.assignment.userId !== session.user.id) {
      return { error: 'Результат не найден или нет доступа' };
    }

    await prisma.surveyComment.create({
      data: {
        resultId,
        authorId: session.user.id,
        text
      }
    });

    revalidatePath(`/my/surveys/${result.assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return { error: 'Не удалось добавить комментарий' };
  }
};
