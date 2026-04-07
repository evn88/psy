import { z } from 'zod';
import { type AiModelId, ALL_AI_MODEL_IDS } from './ai-model-catalog';

export const AI_SKILL_IDS = [
  'blog-article-translation',
  'article-summary',
  'text-translation'
] as const;

/**
 * Идентификатор зарегистрированного AI-навыка.
 */
export const aiSkillIdSchema = z.enum(AI_SKILL_IDS);

export type AiSkillId = z.infer<typeof aiSkillIdSchema>;

export interface AiPromptSlotDescriptor {
  label: string;
  description: string;
  defaultModelId?: AiModelId;
}

export interface AiSkillDescriptor {
  id: AiSkillId;
  label: string;
  description: string;
  defaultModelId: AiModelId;
  availableModelIds: readonly AiModelId[];
  promptSlots: Record<string, AiPromptSlotDescriptor>;
}

/**
 * Клиентский и серверный манифест навыков.
 * Позволяет строить UI-подсказки и не дублировать доступные модели/slot’ы.
 */
export const AI_SKILL_MANIFEST: Record<AiSkillId, AiSkillDescriptor> = {
  'blog-article-translation': {
    id: 'blog-article-translation',
    label: 'Перевод статьи',
    description: 'Переводит title, description и markdown-контент статьи с сохранением структуры.',
    defaultModelId: 'gpt-5.4',
    availableModelIds: ALL_AI_MODEL_IDS,
    promptSlots: {
      title: {
        label: 'Перевод заголовка',
        description: 'Короткий plain-text перевод заголовка без markdown.',
        defaultModelId: 'gpt-5.4-mini'
      },
      description: {
        label: 'Перевод описания',
        description: 'Короткий plain-text перевод описания без markdown.',
        defaultModelId: 'gpt-5.4-mini'
      },
      content: {
        label: 'Перевод контента',
        description: 'Полный перевод markdown-статьи с сохранением форматирования.',
        defaultModelId: 'gpt-5.4'
      }
    }
  },
  'article-summary': {
    id: 'article-summary',
    label: 'Суммаризация статьи',
    description: 'Создаёт краткое plain-text резюме статьи на основе markdown-контента.',
    defaultModelId: 'gpt-5.4-mini',
    availableModelIds: ALL_AI_MODEL_IDS,
    promptSlots: {
      summary: {
        label: 'Суммаризация',
        description: 'Один summarization prompt для генерации итогового резюме.',
        defaultModelId: 'gpt-5.4-mini'
      }
    }
  },
  'text-translation': {
    id: 'text-translation',
    label: 'Перевод текста',
    description:
      'Переводит произвольный текст сразу на несколько языков с сохранением исходного форматирования.',
    defaultModelId: 'gpt-5.4',
    availableModelIds: ALL_AI_MODEL_IDS,
    promptSlots: {
      translation: {
        label: 'Перевод текста',
        description:
          'Общий prompt для перевода текста на каждую целевую локаль с сохранением структуры.',
        defaultModelId: 'gpt-5.4'
      }
    }
  }
};
