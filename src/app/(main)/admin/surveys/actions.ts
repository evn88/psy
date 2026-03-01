'use server';

import prisma from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE', 'TEXT', 'SCALE']),
  options: z.array(z.string()).optional(),
  order: z.number()
});

const updateSurveySchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1)
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
            options: q.options ? q.options : Prisma.DbNull,
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
    revalidatePath(`/admin/surveys/${surveyId}`);
    return { success: true };
  } catch (error) {
    console.error('Ошибка назначения опроса:', error);
    return { error: 'Не удалось назначить опрос' };
  }
};

/**
 * Удаляет назначение опроса пользователю.
 * @param surveyId - ID опроса
 * @param userId - ID пользователя
 * @param deleteResults - Удалять ли результаты прохождения
 */
export const removeAssignment = async (
  surveyId: string,
  userId: string,
  deleteResults: boolean
) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  try {
    const assignment = await prisma.surveyAssignment.findUnique({
      where: {
        surveyId_userId: { surveyId, userId }
      }
    });

    if (!assignment) {
      return { error: 'Назначение не найдено' };
    }

    if (deleteResults) {
      await prisma.surveyAssignment.delete({
        where: { id: assignment.id }
      });
    } else {
      await prisma.surveyAssignment.update({
        where: { id: assignment.id },
        data: { isArchived: true }
      });
    }

    revalidatePath('/admin/surveys');
    revalidatePath(`/admin/surveys/${surveyId}`);
    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления назначения:', error);
    return { error: 'Не удалось удалить назначение' };
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

/**
 * Обновляет опрос и его вопросы.
 */
export const updateSurvey = async (data: z.infer<typeof updateSurveySchema>) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  const parsed = updateSurveySchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Некорректные данные' };
  }

  try {
    const { id, title, description, questions } = parsed.data;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.survey.update({
        where: { id },
        data: { title, description }
      });

      const existingQuestions = await tx.surveyQuestion.findMany({
        where: { surveyId: id, isDeleted: false }
      });

      const inputQuestionIds = questions.filter((q: any) => q.id).map((q: any) => q.id as string);

      const toDelete = existingQuestions.filter((q: any) => !inputQuestionIds.includes(q.id));
      if (toDelete.length > 0) {
        await tx.surveyQuestion.updateMany({
          where: { id: { in: toDelete.map((q: any) => q.id) } },
          data: { isDeleted: true }
        });
      }

      for (const q of questions) {
        if (q.id && existingQuestions.some((eq: any) => eq.id === q.id)) {
          await tx.surveyQuestion.update({
            where: { id: q.id },
            data: {
              text: q.text,
              type: q.type,
              options: q.options ? q.options : Prisma.DbNull,
              order: q.order
            }
          });
        } else {
          await tx.surveyQuestion.create({
            data: {
              surveyId: id,
              text: q.text,
              type: q.type,
              options: q.options ? q.options : Prisma.DbNull,
              order: q.order
            }
          });
        }
      }
    });

    revalidatePath('/admin/surveys');
    revalidatePath(`/admin/surveys/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Ошибка обновления опроса:', error);
    return { error: 'Не удалось обновить опрос' };
  }
};
