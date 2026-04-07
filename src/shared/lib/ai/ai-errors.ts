/**
 * Ошибка конфигурации AI-слоя.
 */
export class AiSkillConfigurationError extends Error {}

/**
 * Ошибка поиска зарегистрированного навыка.
 */
export class AiSkillNotFoundError extends Error {}

/**
 * Ошибка валидации runtime-override для prompt-slot’ов.
 */
export class AiSkillPromptOverrideError extends Error {}
