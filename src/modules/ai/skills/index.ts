import 'server-only';

import type { AiSkillId } from '../ai-skill-manifest';
import type { AnyAiSkillDefinition } from '../ai-skill-factory';
import { articleSummarySkill } from './article-summary-skill';
import { blogArticleTranslationSkill } from './blog-article-translation-skill';
import { textTranslationSkill } from './text-translation-skill';

const AI_SKILLS: Record<AiSkillId, AnyAiSkillDefinition> = {
  'blog-article-translation': blogArticleTranslationSkill,
  'article-summary': articleSummarySkill,
  'text-translation': textTranslationSkill
};

/**
 * Возвращает зарегистрированный AI-навык по идентификатору.
 *
 * @param skillId Идентификатор навыка.
 * @returns Навык из реестра.
 */
export const getAiSkill = (skillId: AiSkillId) => {
  return AI_SKILLS[skillId];
};

/**
 * Возвращает все зарегистрированные AI-навыки.
 *
 * @returns Массив навыков.
 */
export const getAiSkills = () => {
  return Object.values(AI_SKILLS);
};
