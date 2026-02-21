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
        text
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
