import { z } from 'zod';

export const AI_MODEL_IDS = ['gpt-5.4', 'gpt-5.4-mini'] as const;

/**
 * Идентификатор модели, доступной внутри приложения.
 */
export const aiModelIdSchema = z.enum(AI_MODEL_IDS);

export type AiModelId = z.infer<typeof aiModelIdSchema>;

/**
 * Полный список моделей, разрешённых в приложении.
 * Используется в местах, где навык поддерживает весь каталог без ограничений.
 */
export const ALL_AI_MODEL_IDS = [...AI_MODEL_IDS] as const satisfies readonly AiModelId[];

export interface AiModelDescriptor {
  id: AiModelId;
  label: string;
  providerModelId: string;
  description: string;
  tags: string[];
}

/**
 * Каталог моделей, доступных для AI-навыков приложения.
 * Используется и на клиенте, и на сервере как единый источник правды.
 */
export const AI_MODEL_CATALOG: Record<AiModelId, AiModelDescriptor> = {
  'gpt-5.4': {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    providerModelId: 'openai/gpt-5.4',
    description: 'Основная точная модель для сложных редакторских и markdown-задач.',
    tags: ['quality', 'translation', 'markdown']
  },
  'gpt-5.4-mini': {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    providerModelId: 'openai/gpt-5.4-mini',
    description: 'Быстрая и дешёвая модель для коротких текстовых преобразований.',
    tags: ['fast', 'economy', 'metadata']
  }
};
