import { z } from 'zod';

export const intakeQuestionTypes = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'SINGLE_CHOICE',
  'MULTI_CHOICE'
] as const;

export type IntakeQuestionType = (typeof intakeQuestionTypes)[number];

export const intakeOptionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(300)
});

export const intakeQuestionSchema = z
  .object({
    id: z.string().min(1).max(80),
    label: z.string().trim().min(1).max(500),
    helperText: z.string().trim().max(1000).optional(),
    type: z.enum(intakeQuestionTypes),
    required: z.boolean(),
    options: z.array(intakeOptionSchema).max(50)
  })
  .superRefine((question, context) => {
    const requiresOptions = question.type === 'SINGLE_CHOICE' || question.type === 'MULTI_CHOICE';

    if (requiresOptions && question.options.length < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Для вопроса с выбором нужен хотя бы один вариант',
        path: ['options']
      });
    }

    if (!requiresOptions && question.options.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Варианты допустимы только для вопросов с выбором',
        path: ['options']
      });
    }

    const optionIds = new Set<string>();
    question.options.forEach((option, optionIndex) => {
      if (optionIds.has(option.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Идентификаторы вариантов ответа должны быть уникальными',
          path: ['options', optionIndex, 'id']
        });
      }
      optionIds.add(option.id);
    });
  });

export const intakeStepSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).optional(),
  questions: z.array(intakeQuestionSchema).min(1).max(30)
});

export const intakeFormStepsSchema = z
  .array(intakeStepSchema)
  .min(1)
  .max(20)
  .superRefine((steps, context) => {
    const questionIds = new Set<string>();
    const stepIds = new Set<string>();

    steps.forEach((step, stepIndex) => {
      if (stepIds.has(step.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Идентификаторы шагов должны быть уникальными',
          path: [stepIndex, 'id']
        });
      }
      stepIds.add(step.id);
      step.questions.forEach((question, questionIndex) => {
        if (questionIds.has(question.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Идентификаторы вопросов должны быть уникальными',
            path: [stepIndex, 'questions', questionIndex, 'id']
          });
        }
        questionIds.add(question.id);
      });
    });
  });

export type IntakeFormSteps = z.infer<typeof intakeFormStepsSchema>;
export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;

/**
 * Структура анкеты по умолчанию. Она сохраняет прежние вопросы и служит стартовой точкой
 * в редакторе, пока администратор не опубликует свою версию.
 */
export const defaultIntakeFormSteps: IntakeFormSteps = [
  {
    id: 'personal-data',
    title: 'Знакомство',
    questions: [
      {
        id: 'name',
        label: 'Как к вам обращаться?',
        helperText: 'Укажите имя, которым вам комфортно, чтобы я к вам обращалась.',
        type: 'SHORT_TEXT',
        required: true,
        options: []
      },
      {
        id: 'age',
        label: 'Возраст',
        helperText: 'Это помогает лучше учитывать жизненный контекст.',
        type: 'NUMBER',
        required: true,
        options: []
      }
    ]
  },
  {
    id: 'main-request',
    title: 'Ваш запрос',
    questions: [
      {
        id: 'mainRequest',
        label: 'Опишите ваш запрос на терапию',
        helperText: 'Можно тезисно — основные темы, с которыми вы хотите поработать.',
        type: 'LONG_TEXT',
        required: true,
        options: []
      }
    ]
  },
  {
    id: 'topics',
    title: 'Актуальные темы',
    questions: [
      {
        id: 'requestChecklist',
        label: 'Какие темы актуальны для вас сейчас?',
        helperText: 'Можно выбрать несколько пунктов.',
        type: 'MULTI_CHOICE',
        required: false,
        options: [
          {
            id: 'masking_identity',
            label: 'Маскинг, за которым теряется ощущение своей идентичности'
          },
          {
            id: 'self_comparison',
            label: 'Постоянное сравнение себя с другими, мысли: «что со мной не так?»'
          },
          { id: 'self_acceptance', label: 'Трудности с принятием себя' },
          { id: 'self_esteem', label: 'Трудности с самооценкой' },
          { id: 'loneliness', label: 'Одиночество' },
          { id: 'anxiety', label: 'Тревожность' },
          { id: 'sleep_issues', label: 'Проблемы со сном' },
          { id: 'emigration', label: 'Эмиграция и адаптация к жизни в другой стране' },
          { id: 'career_lost', label: 'Чувство растерянности в выборе пути' },
          {
            id: 'work_cycle',
            label: 'Частая смена работы по циклу: переработки → выгорание → увольнение'
          },
          {
            id: 'procrastination',
            label: 'Прокрастинация и ощущение, что невозможно заставить себя делать дела'
          },
          { id: 'loneliness_people', label: 'Чувство одиночества даже рядом с людьми' },
          {
            id: 'emotional_outbursts',
            label: 'Сильные эмоциональные вспышки, которые мешают отношениям'
          },
          { id: 'negative_loop', label: 'Зацикливание на негативе, трудность переключиться' },
          { id: 'burnout', label: 'Выгорание' },
          { id: 'motivation', label: 'Поиск внутренней мотивации' },
          { id: 'goals', label: 'Трудности с целеполаганием' },
          {
            id: 'daily_load',
            label: 'Сложность адаптироваться к нагрузке и повседневным требованиям'
          },
          { id: 'adhd', label: 'Трудности, связанные с СДВГ' },
          { id: 'asd', label: 'Трудности, связанные с РАС' },
          { id: 'binge_eating', label: 'Компульсивное переедание' },
          { id: 'bulimia', label: 'Нервная булимия' },
          { id: 'other', label: 'Другое' }
        ]
      }
    ]
  },
  {
    id: 'comment',
    title: 'Дополнительно',
    questions: [
      {
        id: 'comment',
        label: 'Комментарий',
        helperText: 'Напишите всё, что считаете важным.',
        type: 'LONG_TEXT',
        required: false,
        options: []
      }
    ]
  }
];

/** Валидирует ответ пользователя по опубликованной структуре вопроса. */
export const isValidIntakeAnswer = (question: IntakeQuestion, value: unknown): boolean => {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return !question.required;
  }

  if (question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT') {
    return typeof value === 'string' && value.trim().length > 0;
  }

  if (question.type === 'NUMBER') {
    return typeof value === 'number' && Number.isFinite(value);
  }

  const optionIds = new Set(question.options.map(option => option.id));
  if (question.type === 'SINGLE_CHOICE') {
    return typeof value === 'string' && optionIds.has(value);
  }

  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(optionId => typeof optionId === 'string' && optionIds.has(optionId))
  );
};
