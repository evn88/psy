import { describe, expect, it } from 'vitest';
import englishMessages from '../../../../messages/en.json';
import serbianMessages from '../../../../messages/sr.json';
import {
  getDefaultIntakeFormSteps,
  isIntakeConsentAccepted,
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

  it('принимает только явно подтверждённое согласие', () => {
    expect(isIntakeConsentAccepted(true)).toBe(true);
    expect(isIntakeConsentAccepted(false)).toBe(false);
    expect(isIntakeConsentAccepted('true')).toBe(false);
    expect(isIntakeConsentAccepted(undefined)).toBe(false);
  });

  it('собирает fallback-анкету на языке переданных переводов', () => {
    const englishSteps = getDefaultIntakeFormSteps(englishMessages.IntakeWizard);
    const serbianSteps = getDefaultIntakeFormSteps(serbianMessages.IntakeWizard);

    expect(englishSteps[0]?.title).toBe('Getting to know you');
    expect(englishSteps[0]?.questions[0]?.label).toBe('How should I address you?');
    expect(serbianSteps[0]?.title).toBe('Upoznavanje');
    expect(serbianSteps[2]?.questions[0]?.options[0]?.label).toBe(
      'Maskiranje zbog kojeg se gubi osećaj sopstvenog identiteta'
    );
  });
});
