import 'server-only';

import {
  createProviderRegistry,
  customProvider,
  defaultSettingsMiddleware,
  gateway,
  wrapLanguageModel
} from 'ai';
import { AI_MODEL_CATALOG, type AiModelId, ALL_AI_MODEL_IDS } from './ai-model-catalog';
import { AiSkillConfigurationError } from './ai-errors';

/**
 * Создаёт обёртку над gateway-моделью с едиными дефолтами для редакторских задач.
 *
 * @param modelId Идентификатор модели из каталога приложения.
 * @returns Языковая модель AI SDK.
 */
const createLanguageModelPreset = (modelId: AiModelId) => {
  return wrapLanguageModel({
    model: gateway(AI_MODEL_CATALOG[modelId].providerModelId),
    middleware: defaultSettingsMiddleware({
      settings: {
        temperature: 0
      }
    })
  });
};

/**
 * Собирает runtime-реестр language model'ей строго из каталога моделей.
 *
 * @returns Объект languageModels для `customProvider`.
 */
const createCatalogLanguageModels = () => {
  return ALL_AI_MODEL_IDS.reduce<Record<AiModelId, ReturnType<typeof createLanguageModelPreset>>>(
    (languageModels, modelId) => {
      languageModels[modelId] = createLanguageModelPreset(modelId);
      return languageModels;
    },
    {} as Record<AiModelId, ReturnType<typeof createLanguageModelPreset>>
  );
};

const appAiProvider = customProvider({
  languageModels: createCatalogLanguageModels(),
  fallbackProvider: gateway
});

const aiProviderRegistry = createProviderRegistry({
  app: appAiProvider
});

/**
 * Проверяет, что доступ к AI Gateway сконфигурирован.
 *
 * @throws AiSkillConfigurationError Если не задан `AI_GATEWAY_API_KEY`.
 */
export const assertAiGatewayConfigured = () => {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new AiSkillConfigurationError(
      'AI Gateway не настроен. Добавьте AI_GATEWAY_API_KEY в переменные окружения.'
    );
  }
};

/**
 * Возвращает языковую модель по внутреннему alias приложения.
 *
 * @param modelId Идентификатор модели из каталога приложения.
 * @returns Языковая модель AI SDK.
 */
export const resolveAiLanguageModel = (modelId: AiModelId) => {
  return aiProviderRegistry.languageModel(`app:${modelId}`);
};
