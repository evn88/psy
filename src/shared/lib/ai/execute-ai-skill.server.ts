import 'server-only';

import { generateText } from 'ai';
import type { z } from 'zod';
import { AiSkillNotFoundError, AiSkillPromptOverrideError } from './ai-errors';
import { assertAiGatewayConfigured, resolveAiLanguageModel } from './ai-registry.server';
import type { AiSkillExecuteRequest } from './ai-contracts';
import type { AiSkillId } from './ai-skill-manifest';
import { AI_SKILL_MANIFEST } from './ai-skill-manifest';
import {
  type AnyAiSkillDefinition,
  composePromptText,
  resolvePromptOverridesForSlot
} from './ai-skill-factory';
import { getAiSkill } from './skills';

/**
 * Проверяет, что runtime-override использует только разрешённые slot’ы навыка.
 *
 * @param skill Навык, для которого выполняется проверка.
 * @param request Контракт выполнения навыка.
 * @throws AiSkillPromptOverrideError Если указан несуществующий slot.
 */
const validatePromptOverrideSlots = (
  skill: AnyAiSkillDefinition,
  request: AiSkillExecuteRequest
) => {
  const overrideKeys = Object.keys(request.overrides ?? {});
  const allowedSlots = new Set(['default', ...Object.keys(skill.descriptor.promptSlots)]);
  const invalidSlot = overrideKeys.find(slot => !allowedSlots.has(slot));

  if (invalidSlot) {
    throw new AiSkillPromptOverrideError(
      `Навык "${skill.id}" не поддерживает prompt-slot "${invalidSlot}".`
    );
  }
};

/**
 * Нормализует context для навыка с учётом опциональной contextSchema.
 *
 * @param skill Навык из реестра.
 * @param request Запрос на выполнение навыка.
 * @returns Валидированный context или `undefined`.
 */
const parseSkillContext = (
  skill: AnyAiSkillDefinition,
  request: AiSkillExecuteRequest
): z.infer<NonNullable<typeof skill.contextSchema>> | undefined => {
  if (!skill.contextSchema) {
    return undefined;
  }

  return skill.contextSchema.parse(request.context);
};

/**
 * Выполняет AI-навык через единый реестр моделей и prompt-slot override’ы.
 *
 * @param skillId Идентификатор навыка.
 * @param request Универсальный runtime-запрос.
 * @returns Валидированный результат навыка.
 */
export const executeAiSkill = async <TResult>(
  skillId: AiSkillId,
  request: AiSkillExecuteRequest
) => {
  const descriptor = AI_SKILL_MANIFEST[skillId];

  if (!descriptor) {
    throw new AiSkillNotFoundError(`AI-навык "${skillId}" не зарегистрирован.`);
  }

  const skill = getAiSkill(skillId);

  if (!skill) {
    throw new AiSkillNotFoundError(`AI-навык "${skillId}" не найден в реестре.`);
  }

  validatePromptOverrideSlots(skill, request);
  assertAiGatewayConfigured();

  const input = skill.inputSchema.parse(request.input);
  const context = parseSkillContext(skill, request);

  const result = await skill.execute({
    input,
    context,
    request,
    descriptor,
    generateText: async ({ slot, prompt, system, modelId, ...settings }) => {
      const slotDescriptor = descriptor.promptSlots[slot];

      if (!slotDescriptor) {
        throw new AiSkillPromptOverrideError(
          `Навык "${skillId}" не поддерживает prompt-slot "${slot}".`
        );
      }

      const runtimePromptOverride = resolvePromptOverridesForSlot(request.overrides, slot);
      const resolvedPrompt = composePromptText({
        baseText: prompt,
        overrideText: runtimePromptOverride.prompt,
        appendText: runtimePromptOverride.promptAppend
      });

      if (!resolvedPrompt) {
        throw new AiSkillPromptOverrideError(
          `Для навыка "${skillId}" slot "${slot}" получил пустой prompt после merge.`
        );
      }

      const resolvedSystem = composePromptText({
        baseText: system,
        overrideText: runtimePromptOverride.system,
        appendText: runtimePromptOverride.systemAppend
      });
      const resolvedModelId =
        modelId ?? request.modelId ?? slotDescriptor.defaultModelId ?? descriptor.defaultModelId;

      const response = await generateText({
        model: resolveAiLanguageModel(resolvedModelId),
        prompt: resolvedPrompt,
        ...(resolvedSystem ? { system: resolvedSystem } : {}),
        ...settings
      });

      return response.text;
    }
  });

  return skill.outputSchema.parse(result) as TResult;
};
