import { describe, expect, it } from 'vitest';
import {
  isValidIntakeAnswer,
  intakeFormStepsSchema,
  type IntakeQuestion
} from '../form-definition';

const requiredChoiceQuestion: IntakeQuestion = {
  id: 'topic',
  label: 'Выберите тему',
  type: 'MULTI_CHOICE',
  required: true,
  options: [{ id: 'anxiety', label: 'Тревожность' }]
};

describe('структура первичной анкеты', () => {
  it('отклоняет вопрос с выбором без вариантов ответа', () => {
    const result = intakeFormStepsSchema.safeParse([
      {
        id: 'step',
        title: 'Шаг',
        questions: [{ ...requiredChoiceQuestion, options: [] }]
      }
    ]);

    expect(result.success).toBe(false);
  });

  it('принимает только опубликованные варианты ответа', () => {
    expect(isValidIntakeAnswer(requiredChoiceQuestion, ['anxiety'])).toBe(true);
    expect(isValidIntakeAnswer(requiredChoiceQuestion, ['unknown'])).toBe(false);
    expect(isValidIntakeAnswer(requiredChoiceQuestion, [])).toBe(false);
  });
});
