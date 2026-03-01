'use server';

import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE', 'TEXT', 'SCALE']),
  options: z.array(z.string()).optional(),
  order: z.number()
});

const createSurveySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1)
});

/**
 * Создаёт новый опрос с вопросами.
 * Доступно только администратору.
 * @param data - данные опроса (название, описание, вопросы)
 */
export const createSurvey = async (data: z.infer<typeof createSurveySchema>) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  const parsed = createSurveySchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Некорректные данные' };
  }

  try {
    const survey = await prisma.survey.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        createdById: session.user.id,
        questions: {
          create: parsed.data.questions.map((q, index) => ({
            text: q.text,
            type: q.type,
            options: q.options || null,
            order: q.order ?? index
          }))
        }
      }
    });

    revalidatePath('/admin/surveys');
    return { success: true, surveyId: survey.id };
  } catch (error) {
    console.error('Ошибка создания опроса:', error);
    return { error: 'Не удалось создать опрос' };
  }
};

/**
 * Назначает опрос пользователю.
 * @param surveyId - ID опроса
 * @param userId - ID пользователя
 */
export const assignSurvey = async (surveyId: string, userId: string) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  try {
    await prisma.surveyAssignment.create({
      data: { surveyId, userId }
    });

    revalidatePath('/admin/surveys');
    return { success: true };
  } catch (error) {
    console.error('Ошибка назначения опроса:', error);
    return { error: 'Не удалось назначить опрос' };
  }
};

/**
 * Добавляет комментарий администратора к результату опроса.
 * @param resultId - ID результата
 * @param text - текст комментария
 */
export const addComment = async (resultId: string, text: string) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  try {
    await prisma.surveyComment.create({
      data: {
        resultId,
        authorId: session.user.id,
        text,
        isReadByAdmin: true,
        isReadByUser: false
      }
    });

    revalidatePath('/admin/surveys');
    return { success: true };
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return { error: 'Не удалось добавить комментарий' };
  }
};

/**
 * Отмечает все сообщения в указанном опросе как прочитанные администратором.
 * @param surveyId - ID опроса
 */
export const markAsReadByAdmin = async (surveyId: string) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        assignments: {
          include: {
            result: true
          }
        }
      }
    });

    if (!survey) {
      return { error: 'Опрос не найден' };
    }

    const resultIds = survey.assignments
      .map((a: any) => a.result?.id)
      .filter((id: any): id is string => Boolean(id));

    if (resultIds.length > 0) {
      await prisma.surveyComment.updateMany({
        where: {
          resultId: { in: resultIds },
          isReadByAdmin: false
        },
        data: {
          isReadByAdmin: true
        }
      });
      revalidatePath('/admin', 'layout');
    }

    return { success: true };
  } catch (error) {
    console.error('Ошибка отметки сообщений как прочитанных:', error);
    return { error: 'Не удалось отметить сообщения как прочитанные' };
  }
};

/**
 * Получает количество опросов с непрочитанными комментариями для администратора.
 */
export const getAdminUnreadSurveysCount = async () => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return 0;
  }

  try {
    const unreadSurveys = await prisma.survey.count({
      where: {
        assignments: {
          some: {
            result: {
              comments: {
                some: {
                  isReadByAdmin: false
                }
              }
            }
          }
        }
      }
    });

    return unreadSurveys;
  } catch (error) {
    console.error('Ошибка получения кол-ва непрочитанных опросов:', error);
    return 0;
  }
};

/**
 * Удаляет опрос.
 * @param surveyId - ID опроса
 */
export const deleteSurvey = async (surveyId: string) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  try {
    await prisma.survey.delete({
      where: { id: surveyId }
    });

    revalidatePath('/admin/surveys');
    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления опроса:', error);
    return { error: 'Не удалось удалить опрос' };
  }
};

/**
 * Удаляет все комментарии для определенного результата (пользователя) в опросе.
 * @param resultId - ID результата
 */
export const clearComments = async (resultId: string) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  try {
    await prisma.surveyComment.deleteMany({
      where: { resultId }
    });

    revalidatePath('/admin/surveys');
    return { success: true };
  } catch (error) {
    console.error('Ошибка очистки комментариев:', error);
    return { error: 'Не удалось очистить комментарии' };
  }
};
