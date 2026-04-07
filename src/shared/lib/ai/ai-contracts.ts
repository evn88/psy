import { z } from 'zod';
import { aiModelIdSchema } from './ai-model-catalog';
import { aiSkillIdSchema } from './ai-skill-manifest';

const aiPromptOverrideTextSchema = z.string().trim().min(1).max(8_000);

/**
 * Переопределяет системный и пользовательский prompt для отдельного slot’а навыка.
 */
export const aiPromptOverrideSchema = z
  .object({
    system: aiPromptOverrideTextSchema.optional(),
    systemAppend: aiPromptOverrideTextSchema.optional(),
    prompt: aiPromptOverrideTextSchema.optional(),
    promptAppend: aiPromptOverrideTextSchema.optional()
  })
  .refine(value => Object.values(value).some(Boolean), {
    message: 'Хотя бы одно поле prompt override должно быть заполнено'
  });

/**
 * Набор override’ов по именам slot’ов.
 * Ключ `default` применяется ко всем slot’ам и может быть дополнен slot-специфичными значениями.
 */
export const aiSkillPromptOverridesSchema = z.record(z.string().min(1), aiPromptOverrideSchema);

export type AiSkillPromptOverrides = z.infer<typeof aiSkillPromptOverridesSchema>;

/**
 * Универсальный контракт выполнения AI-навыка.
 * Валидация `input` и `context` делегируется самому навыку.
 */
export const aiSkillExecuteRequestSchema = z.object({
  input: z.unknown(),
  context: z.unknown().optional(),
  modelId: aiModelIdSchema.optional(),
  overrides: aiSkillPromptOverridesSchema.optional()
});

export type AiSkillExecuteRequest = z.infer<typeof aiSkillExecuteRequestSchema>;

/**
 * Универсальный ответ AI API.
 */
export const aiSkillExecuteResponseSchema = z.object({
  skillId: aiSkillIdSchema,
  data: z.unknown()
});

export type AiSkillExecuteResponse = z.infer<typeof aiSkillExecuteResponseSchema>;
