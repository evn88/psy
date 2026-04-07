import { z } from 'zod';
import type { AiSkillExecuteRequest, AiSkillPromptOverrides } from './ai-contracts';
import type { AiModelId } from './ai-model-catalog';
import { AI_SKILL_MANIFEST, type AiSkillDescriptor, type AiSkillId } from './ai-skill-manifest';

type InferSchema<TSchema extends z.ZodTypeAny | undefined> = TSchema extends z.ZodTypeAny
  ? z.infer<TSchema>
  : undefined;

export interface AiSkillGenerateTextCall {
  slot: string;
  prompt: string;
  system?: string;
  modelId?: AiModelId;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiSkillExecutionContext<TInput, TContext> {
  input: TInput;
  context: TContext;
  request: AiSkillExecuteRequest;
  descriptor: AiSkillDescriptor;
  generateText: (call: AiSkillGenerateTextCall) => Promise<string>;
}

export interface AiSkillDefinition<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
  TContextSchema extends z.ZodTypeAny | undefined = undefined
> {
  id: AiSkillId;
  descriptor: AiSkillDescriptor;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  contextSchema?: TContextSchema;
  execute: (
    context: AiSkillExecutionContext<z.infer<TInputSchema>, InferSchema<TContextSchema>>
  ) => Promise<z.infer<TOutputSchema>>;
}

export type AnyAiSkillDefinition = AiSkillDefinition<
  z.ZodTypeAny,
  z.ZodTypeAny,
  z.ZodTypeAny | undefined
>;

interface CreateAiSkillConfig<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
  TContextSchema extends z.ZodTypeAny | undefined = undefined
> {
  id: AiSkillId;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  contextSchema?: TContextSchema;
  execute: (
    context: AiSkillExecutionContext<z.infer<TInputSchema>, InferSchema<TContextSchema>>
  ) => Promise<z.infer<TOutputSchema>>;
}

interface CreateTextGenerationAiSkillConfig<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
  TContextSchema extends z.ZodTypeAny | undefined = undefined
> extends Omit<CreateAiSkillConfig<TInputSchema, TOutputSchema, TContextSchema>, 'execute'> {
  slot: string;
  buildPrompt: (context: {
    input: z.infer<TInputSchema>;
    context: InferSchema<TContextSchema>;
  }) => string;
  buildSystem?: (context: {
    input: z.infer<TInputSchema>;
    context: InferSchema<TContextSchema>;
  }) => string | undefined;
  mapResult: (context: {
    text: string;
    input: z.infer<TInputSchema>;
    context: InferSchema<TContextSchema>;
  }) => z.infer<TOutputSchema>;
  modelId?: AiModelId;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Создаёт типизированный AI-навык и связывает его с единым манифестом.
 *
 * @param config Конфигурация навыка.
 * @returns Готовое описание навыка для реестра.
 */
export const createAiSkill = <
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
  TContextSchema extends z.ZodTypeAny | undefined = undefined
>(
  config: CreateAiSkillConfig<TInputSchema, TOutputSchema, TContextSchema>
): AiSkillDefinition<TInputSchema, TOutputSchema, TContextSchema> => {
  return {
    ...config,
    descriptor: AI_SKILL_MANIFEST[config.id]
  };
};

/**
 * Создаёт навык на базе одного `generateText` вызова.
 *
 * @param config Конфигурация prompt-based навыка.
 * @returns Готовое описание навыка.
 */
export const createTextGenerationAiSkill = <
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
  TContextSchema extends z.ZodTypeAny | undefined = undefined
>(
  config: CreateTextGenerationAiSkillConfig<TInputSchema, TOutputSchema, TContextSchema>
): AiSkillDefinition<TInputSchema, TOutputSchema, TContextSchema> => {
  return createAiSkill({
    id: config.id,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    contextSchema: config.contextSchema,
    execute: async ({ input, context, generateText }) => {
      const text = await generateText({
        slot: config.slot,
        modelId: config.modelId,
        prompt: config.buildPrompt({ input, context }),
        system: config.buildSystem?.({ input, context }),
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens
      });

      return config.mapResult({ text, input, context });
    }
  });
};

/**
 * Комбинирует runtime-override из `default` и конкретного slot’а.
 *
 * @param overrides Общий набор override’ов.
 * @param slot Имя prompt-slot’а.
 * @returns Нормализованный набор override’ов для slot’а.
 */
export const resolvePromptOverridesForSlot = (
  overrides: AiSkillPromptOverrides | undefined,
  slot: string
) => {
  const defaultOverride = overrides?.default;
  const slotOverride = overrides?.[slot];

  const joinAppend = (...values: Array<string | undefined>) => {
    const parts = values.map(value => value?.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join('\n\n') : undefined;
  };

  return {
    system: slotOverride?.system ?? defaultOverride?.system,
    systemAppend: joinAppend(defaultOverride?.systemAppend, slotOverride?.systemAppend),
    prompt: slotOverride?.prompt ?? defaultOverride?.prompt,
    promptAppend: joinAppend(defaultOverride?.promptAppend, slotOverride?.promptAppend)
  };
};

/**
 * Собирает итоговый текст prompt’а с учётом полного override и append-части.
 *
 * @param params Базовый текст и runtime-override.
 * @returns Итоговый текст prompt’а или `undefined`, если он остался пустым.
 */
export const composePromptText = ({
  baseText,
  overrideText,
  appendText
}: {
  baseText?: string;
  overrideText?: string;
  appendText?: string;
}) => {
  const normalizedBaseText = overrideText?.trim() ? overrideText.trim() : baseText?.trim();
  const normalizedAppendText = appendText?.trim();
  const parts = [normalizedBaseText, normalizedAppendText].filter(Boolean);

  return parts.length > 0 ? parts.join('\n\n') : undefined;
};
