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

type DefaultIntakeChecklistOptionId =
  | 'masking_identity'
  | 'self_comparison'
  | 'self_acceptance'
  | 'self_esteem'
  | 'loneliness'
  | 'anxiety'
  | 'sleep_issues'
  | 'emigration'
  | 'career_lost'
  | 'work_cycle'
  | 'procrastination'
  | 'loneliness_people'
  | 'emotional_outbursts'
  | 'negative_loop'
  | 'burnout'
  | 'motivation'
  | 'goals'
  | 'daily_load'
  | 'adhd'
  | 'asd'
  | 'binge_eating'
  | 'bulimia'
  | 'other';

export type DefaultIntakeFormMessages = {
  fields: {
    nameLabel: string;
    nameHelper: string;
    ageLabel: string;
    ageHelper: string;
    mainRequestLabel: string;
    mainRequestHelper: string;
    checklistLabel: string;
    checklistHelper: string;
    commentLabel: string;
    commentHelper: string;
  };
  steps: Record<'personalData' | 'mainRequest' | 'topics' | 'comment', string>;
  checklist: Record<DefaultIntakeChecklistOptionId, string>;
};

/**
 * Собирает локализованную структуру анкеты по умолчанию для редактора и клиентского мастера.
 */
export const getDefaultIntakeFormSteps = (messages: DefaultIntakeFormMessages): IntakeFormSteps => [
  {
    id: 'personal-data',
    title: messages.steps.personalData,
    questions: [
      {
        id: 'name',
        label: messages.fields.nameLabel,
        helperText: messages.fields.nameHelper,
        type: 'SHORT_TEXT',
        required: true,
        options: []
      },
      {
        id: 'age',
        label: messages.fields.ageLabel,
        helperText: messages.fields.ageHelper,
        type: 'NUMBER',
        required: true,
        options: []
      }
    ]
  },
  {
    id: 'main-request',
    title: messages.steps.mainRequest,
    questions: [
      {
        id: 'mainRequest',
        label: messages.fields.mainRequestLabel,
        helperText: messages.fields.mainRequestHelper,
        type: 'LONG_TEXT',
        required: true,
        options: []
      }
    ]
  },
  {
    id: 'topics',
    title: messages.steps.topics,
    questions: [
      {
        id: 'requestChecklist',
        label: messages.fields.checklistLabel,
        helperText: messages.fields.checklistHelper,
        type: 'MULTI_CHOICE',
        required: false,
        options: [
          {
            id: 'masking_identity',
            label: messages.checklist.masking_identity
          },
          {
            id: 'self_comparison',
            label: messages.checklist.self_comparison
          },
          { id: 'self_acceptance', label: messages.checklist.self_acceptance },
          { id: 'self_esteem', label: messages.checklist.self_esteem },
          { id: 'loneliness', label: messages.checklist.loneliness },
          { id: 'anxiety', label: messages.checklist.anxiety },
          { id: 'sleep_issues', label: messages.checklist.sleep_issues },
          { id: 'emigration', label: messages.checklist.emigration },
          { id: 'career_lost', label: messages.checklist.career_lost },
          {
            id: 'work_cycle',
            label: messages.checklist.work_cycle
          },
          {
            id: 'procrastination',
            label: messages.checklist.procrastination
          },
          { id: 'loneliness_people', label: messages.checklist.loneliness_people },
          {
            id: 'emotional_outbursts',
            label: messages.checklist.emotional_outbursts
          },
          { id: 'negative_loop', label: messages.checklist.negative_loop },
          { id: 'burnout', label: messages.checklist.burnout },
          { id: 'motivation', label: messages.checklist.motivation },
          { id: 'goals', label: messages.checklist.goals },
          {
            id: 'daily_load',
            label: messages.checklist.daily_load
          },
          { id: 'adhd', label: messages.checklist.adhd },
          { id: 'asd', label: messages.checklist.asd },
          { id: 'binge_eating', label: messages.checklist.binge_eating },
          { id: 'bulimia', label: messages.checklist.bulimia },
          { id: 'other', label: messages.checklist.other }
        ]
      }
    ]
  },
  {
    id: 'comment',
    title: messages.steps.comment,
    questions: [
      {
        id: 'comment',
        label: messages.fields.commentLabel,
        helperText: messages.fields.commentHelper,
        type: 'LONG_TEXT',
        required: false,
        options: []
      }
    ]
  }
];

/** Проверяет, что пользователь явно подтвердил согласие на обработку персональных данных. */
export const isIntakeConsentAccepted = (value: unknown): value is true => value === true;

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
