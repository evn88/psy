const { z } = require('zod');

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

const testData = {
  id: 'ckx29310',
  title: 'Test survey',
  description: undefined,
  questions: [
    {
      id: 'q1',
      text: 'test',
      type: 'TEXT',
      options: [],
      order: 0
    }
  ]
};

const result = updateSurveySchema.safeParse(testData);
if (!result.success) {
  console.log(result.error.format());
} else {
  console.log('Success!', result.data);
}
