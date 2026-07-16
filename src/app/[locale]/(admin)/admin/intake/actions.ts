'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { intakeFormStepsSchema, type IntakeFormSteps } from '@/modules/intake/form-definition';
import { saveIntakeFormDefinition } from '@/modules/intake/form-definition.server';
import { isLocale } from '@/i18n/config';

/** Публикует новую версию первичной анкеты для выбранной локали. */
export async function updateIntakeForm(locale: string, steps: IntakeFormSteps) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Недостаточно прав' };
  }

  if (!isLocale(locale)) {
    return { error: 'Некорректная локаль' };
  }

  const parsedSteps = intakeFormStepsSchema.safeParse(steps);
  if (!parsedSteps.success) {
    return { error: 'Проверьте заполнение шагов, вопросов и вариантов ответа' };
  }

  try {
    const configuration = await saveIntakeFormDefinition(locale, parsedSteps.data);
    revalidatePath('/admin/intake');
    revalidatePath('/my/surveys');

    return { success: true, version: configuration.version };
  } catch (error) {
    console.error('Не удалось сохранить первичную анкету:', error);
    return { error: 'Не удалось сохранить анкету' };
  }
}
