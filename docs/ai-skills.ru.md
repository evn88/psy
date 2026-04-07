# AI-навыки: архитектура, использование и расширение

## Назначение

В проекте появился универсальный AI-слой для задач вроде:

- перевода статей;
- перевода произвольного текста на несколько языков;
- суммаризации;
- будущих редакторских и контентных задач;
- любых других сценариев, где нужно централизованно управлять:
    - доступными моделями;
    - системными prompt’ами;
    - пользовательскими prompt’ами;
    - выбором модели под конкретную задачу;
    - единым API вызова из UI и route handler’ов.

Главная идея: **компоненты и роуты больше не должны знать детали работы с `generateText`, `gateway`, конкретной моделью
и форматированием prompt’ов**. Они знают только:

- какой `skillId` нужен;
- какой `input` нужно передать;
- нужно ли переопределить модель;
- нужно ли дополнить или заменить prompt.

---

## Где что лежит

### Основные файлы

```text
src/shared/lib/ai/
  ai-model-catalog.ts
  ai-skill-manifest.ts
  ai-contracts.ts
  ai-errors.ts
  ai-skill-factory.ts
  ai-registry.server.ts
  execute-ai-skill.server.ts
  hooks/
    use-ai-skill.ts
  skills/
    index.ts
    blog-article-translation.contract.ts
    blog-article-translation-skill.ts
    article-summary.contract.ts
    article-summary-skill.ts
    text-translation.contract.ts
    text-translation-skill.ts

src/app/api/admin/ai/skills/
  route.ts
  [skillId]/route.ts
```

### Текущая интеграция перевода статьи

```text
src/app/api/admin/blog/[id]/translate/route.ts
src/components/admin/blog/translate-modal.tsx
src/app/[locale]/(main)/admin/blog/[id]/_components/blog-editor-form.tsx
```

---

## Как устроена архитектура

## 1. Каталог моделей

Файл: `src/shared/lib/ai/ai-model-catalog.ts`

Здесь объявлены внутренние идентификаторы моделей приложения:

```ts
export const AI_MODEL_IDS = ['gpt-5.4', 'gpt-5.4-mini'] as const;
```

Их задача:

- не размазывать по коду строки вроде `openai/gpt-5.4`;
- иметь стабильные внутренние alias;
- в одном месте описывать label, назначение и provider model id.

Пример:

```ts
export const AI_MODEL_CATALOG = {
  'gpt-5.4': {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    providerModelId: 'openai/gpt-5.4',
    description: 'Основная точная модель для сложных редакторских и markdown-задач.',
    tags: ['quality', 'translation', 'markdown']
  }
};
```

### Когда менять этот файл

- если нужно добавить новую модель;
- если нужно изменить описание модели в UI;
- если нужно переназначить внутренний alias на другой provider model id.

---

## 2. Манифест навыков

Файл: `src/shared/lib/ai/ai-skill-manifest.ts`

Это единый реестр метаданных навыков.

Он отвечает за:

- список доступных `skillId`;
- дефолтную модель навыка;
- список доступных моделей для навыка;
- список prompt-slot’ов.

Сейчас в реестре доступны:

- `blog-article-translation`;
- `text-translation`;
- `article-summary`.

Пример:

```ts
'blog-article-translation': {
  id: 'blog-article-translation',
  label: 'Перевод статьи',
  description: 'Переводит title, description и markdown-контент статьи с сохранением структуры.',
  defaultModelId: 'gpt-5.4',
  availableModelIds: ['gpt-5.4', 'gpt-5.4-mini'],
  promptSlots: {
    title: {
      label: 'Перевод заголовка',
      description: 'Короткий plain-text перевод заголовка без markdown.',
      defaultModelId: 'gpt-5.4-mini'
    },
    content: {
      label: 'Перевод контента',
      description: 'Полный перевод markdown-статьи с сохранением форматирования.',
      defaultModelId: 'gpt-5.4'
    }
  }
}
```

### Что такое prompt-slot

Один навык может состоять из нескольких AI-вызовов.

Например у перевода статьи есть:

- `title`;
- `description`;
- `content`.

Это и есть slot’ы. Для каждого slot’а можно:

- задать свою дефолтную модель;
- отдельно переопределить `system` и `prompt`;
- отдельно дописать `systemAppend` и `promptAppend`.

Это важный момент: **навык не обязан быть одним prompt’ом**.

---

## 3. Контракты

Файл: `src/shared/lib/ai/ai-contracts.ts`

Здесь описан общий runtime-контракт выполнения навыка:

```ts
export const aiSkillExecuteRequestSchema = z.object({
  input: z.unknown(),
  context: z.unknown().optional(),
  modelId: aiModelIdSchema.optional(),
  overrides: aiSkillPromptOverridesSchema.optional()
});
```

### Поля

- `input` — основной payload навыка;
- `context` — дополнительный контекст, если навык его поддерживает;
- `modelId` — принудительный выбор модели;
- `overrides` — замена или дополнение prompt’ов.

### Формат `overrides`

```ts
{
  default: {
    systemAppend: 'Сохраняй нейтральный редакторский тон.'
  },
  content: {
    systemAppend: 'Не изменяй HTML внутри markdown-блоков.',
    promptAppend: 'Особенно внимательно обработай списки.'
  }
}
```

Ключ `default` применяется ко всем slot’ам.

Slot-специфичные ключи:

- дополняют `default`;
- либо переопределяют `system`/`prompt` целиком.

---

## 4. Фабрика навыков

Файл: `src/shared/lib/ai/ai-skill-factory.ts`

Есть два основных способа создавать навыки:

### `createAiSkill`

Используется, когда навык:

- состоит из нескольких AI-вызовов;
- содержит нестандартную оркестрацию;
- сам решает, как комбинировать результаты.

Пример: перевод статьи.

### `createTextGenerationAiSkill`

Используется, когда навык:

- это один `generateText`;
- имеет один slot;
- возвращает простой результат.

Пример: суммаризация статьи.

---

## 5. Реестр моделей

Файл: `src/shared/lib/ai/ai-registry.server.ts`

Здесь используется AI SDK registry:

```ts
const appAiProvider = customProvider({
  languageModels: {
    'gpt-5.4': createLanguageModelPreset('gpt-5.4'),
    'gpt-5.4-mini': createLanguageModelPreset('gpt-5.4-mini')
  },
  fallbackProvider: gateway
});

const aiProviderRegistry = createProviderRegistry({
  app: appAiProvider
});
```

### Почему это правильно

- модели централизованы;
- можно задавать единые дефолты через `defaultSettingsMiddleware`;
- можно подменять модели без переписывания бизнес-кода;
- skill работает с внутренним `modelId`, а не с provider-строкой.

Сейчас всем моделям задан дефолт:

```ts
temperature: 0
```

Если позже понадобится:

- reasoning options;
- provider options;
- отдельные дефолты для разных классов задач,

это место для настройки.

---

## 6. Серверный executor

Файл: `src/shared/lib/ai/execute-ai-skill.server.ts`

Это центральная точка выполнения навыка.

Он делает следующее:

1. ищет навык в реестре;
2. валидирует `input`;
3. валидирует `context`, если он нужен;
4. проверяет доступность `AI_GATEWAY_API_KEY`;
5. проверяет корректность `prompt-slot override`;
6. выбирает итоговую модель;
7. собирает итоговый `system` и `prompt`;
8. вызывает `generateText`;
9. валидирует результат через `outputSchema`.

Именно это позволяет route handler’ам и компонентам быть тонкими.

---

## 7. Универсальный API

### Получение списка навыков и моделей

Файл: `src/app/api/admin/ai/skills/route.ts`

Маршрут:

```text
GET /api/admin/ai/skills
```

Возвращает:

- список навыков;
- список моделей.

Это полезно для:

- UI выбора задачи;
- UI выбора модели;
- админских конфигураторов AI.

### Выполнение навыка

Файл: `src/app/api/admin/ai/skills/[skillId]/route.ts`

Маршрут:

```text
POST /api/admin/ai/skills/:skillId
```

Пример тела запроса:

```json
{
  "input": {
    "content": "# Заголовок\n\nТекст статьи"
  },
  "modelId": "gpt-5.4-mini",
  "overrides": {
    "default": {
      "systemAppend": "Пиши сухо и нейтрально."
    }
  }
}
```

### Ограничение доступа

Оба маршрута сейчас доступны только `ADMIN`.

Если появятся публичные AI-сценарии, для них лучше делать:

- отдельный route handler;
- отдельную авторизацию;
- отдельные лимиты и правила.

---

## 8. Клиентский хук

Файл: `src/shared/lib/ai/hooks/use-ai-skill.ts`

Хук даёт:

- `run`;
- `reset`;
- `status`;
- `error`;
- `data`;
- `descriptor`;
- `availableModels`;
- `isPending`.

### Базовый пример

```tsx
'use client';

import { useAiSkill } from '@/shared/lib/ai/hooks/use-ai-skill';
import type {
  ArticleSummaryInput,
  ArticleSummaryResult
} from '@/shared/lib/ai/skills/article-summary.contract';

export const SummaryButton = () => {
  const { run, isPending, data, error } = useAiSkill<
    ArticleSummaryInput,
    ArticleSummaryResult
  >({
    skillId: 'article-summary'
  });

  const handleClick = async () => {
    await run({
      input: {
        content: '# Статья\n\nБольшой текст...',
        maxSentences: 3
      }
    });
  };

  return (
    <div>
      <button onClick={() => void handleClick()} disabled={isPending}>
        {isPending ? 'Генерирую...' : 'Сделать summary'}
      </button>
      {data ? <p>{data.summary}</p> : null}
      {error ? <p>{error}</p> : null}
    </div>
  );
};
```

### Пример с выбором модели

```tsx
'use client';

import { useState } from 'react';
import { useAiSkill } from '@/shared/lib/ai/hooks/use-ai-skill';
import type { AiModelId } from '@/shared/lib/ai/ai-model-catalog';
import type {
  BlogArticleTranslationInput,
  BlogArticleTranslationResult
} from '@/shared/lib/ai/skills/blog-article-translation.contract';

export const TranslationPanel = () => {
  const [modelId, setModelId] = useState<AiModelId>('gpt-5.4');
  const { run, availableModels, isPending } = useAiSkill<
    BlogArticleTranslationInput,
    BlogArticleTranslationResult
  >({
    skillId: 'blog-article-translation'
  });

  const handleTranslate = async () => {
    await run({
      modelId,
      input: {
        sourceLocale: 'ru',
        targetLocale: 'en',
        title: 'Заголовок',
        description: 'Описание',
        content: '# Статья'
      }
    });
  };

  return (
    <div>
      <select value={modelId} onChange={event => setModelId(event.target.value as AiModelId)}>
        {availableModels.map(model => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>

      <button onClick={() => void handleTranslate()} disabled={isPending}>
        Перевести
      </button>
    </div>
  );
};
```

### Пример с `overrides`

```tsx
await run({
  modelId: 'gpt-5.4',
  input: {
    sourceLocale: 'ru',
    targetLocale: 'en',
    title: 'Заголовок',
    description: 'Описание',
    content: '# Статья'
  },
  overrides: {
    default: {
      systemAppend: 'Сохраняй официальный, но живой стиль.'
    },
    content: {
      systemAppend: 'Никогда не меняй HTML внутри markdown.',
      promptAppend: 'Особенно аккуратно обработай таблицы и списки.'
    }
  }
});
```

---

## Как сейчас используется перевод статьи

### Клиент

В [translate-modal.tsx](/Users/egor/projects/vershkov/src/components/admin/blog/translate-modal.tsx) модалка больше не
знает про низкоуровневый AI API.

Она делает только это:

```ts
const { run: runTranslationSkill } = useAiSkill<
  BlogArticleTranslationInput,
  BlogArticleTranslationResult
>({
  skillId: 'blog-article-translation'
});
```

И вызывает:

```ts
await runTranslationSkill({
  input: {
    sourceLocale: sourceTranslation.locale,
    targetLocale: locale,
    title: sourceTranslation.title,
    description: sourceTranslation.description,
    content: sourceTranslation.content
  }
});
```

### Сервер

В [route.ts](/Users/egor/projects/vershkov/src/app/api/admin/blog/[id]/translate/route.ts) роут больше не строит prompt
вручную.

Он только:

1. проверяет `ADMIN`;
2. достаёт русскую версию статьи из БД;
3. вызывает `executeAiSkill('blog-article-translation', ...)`;
4. сохраняет результат.

Это правильный паттерн для server-side использования навыков.

---

## Как добавить новый навык

Ниже рекомендуемый порядок.

## Шаг 1. Добавить контракт

Создайте файлы:

```text
src/shared/lib/ai/skills/my-skill.contract.ts
src/shared/lib/ai/skills/my-skill.ts
```

Пример контракта:

```ts
import { z } from 'zod';

export const mySkillInputSchema = z.object({
  content: z.string().trim().min(1),
  tone: z.enum(['neutral', 'friendly']).default('neutral')
});

export const mySkillResultSchema = z.object({
  result: z.string().trim().min(1)
});

export type MySkillInput = z.infer<typeof mySkillInputSchema>;
export type MySkillResult = z.infer<typeof mySkillResultSchema>;
```

## Шаг 2. Зарегистрировать `skillId` и метаданные

Обновите `src/shared/lib/ai/ai-skill-manifest.ts`.

Пример:

```ts
export const AI_SKILL_IDS = [
  'blog-article-translation',
  'article-summary',
  'my-skill'
] as const;
```

И добавьте описание:

```ts
'my-skill': {
  id: 'my-skill',
  label: 'Мой навык',
  description: 'Делает что-то полезное с текстом.',
  defaultModelId: 'gpt-5.4-mini',
  availableModelIds: ['gpt-5.4', 'gpt-5.4-mini'],
  promptSlots: {
    main: {
      label: 'Основной prompt',
      description: 'Основная генерация результата.',
      defaultModelId: 'gpt-5.4-mini'
    }
  }
}
```

## Шаг 3. Реализовать навык

### Вариант A. Один AI-вызов

Используйте `createTextGenerationAiSkill`.

```ts
import { createTextGenerationAiSkill } from '../ai-skill-factory';
import { mySkillInputSchema, mySkillResultSchema } from './my-skill.contract';

export const mySkill = createTextGenerationAiSkill({
  id: 'my-skill',
  inputSchema: mySkillInputSchema,
  outputSchema: mySkillResultSchema,
  slot: 'main',
  modelId: 'gpt-5.4-mini',
  buildSystem: ({ input }) => {
    return `Ты редактор. Пиши в тоне: ${input.tone}.`;
  },
  buildPrompt: ({ input }) => {
    return `Обработай текст:\n\n${input.content}`;
  },
  mapResult: ({ text }) => ({
    result: text.trim()
  })
});
```

### Вариант B. Несколько AI-вызовов

Используйте `createAiSkill`.

```ts
import { createAiSkill } from '../ai-skill-factory';
import { mySkillInputSchema, mySkillResultSchema } from './my-skill.contract';

export const mySkill = createAiSkill({
  id: 'my-skill',
  inputSchema: mySkillInputSchema,
  outputSchema: mySkillResultSchema,
  execute: async ({ input, generateText }) => {
    const title = await generateText({
      slot: 'title',
      prompt: `Сделай короткий заголовок для текста:\n\n${input.content}`
    });

    const body = await generateText({
      slot: 'body',
      prompt: `Сделай основной результат:\n\n${input.content}`
    });

    return {
      result: `${title.trim()}\n\n${body.trim()}`
    };
  }
});
```

Если у навыка несколько slot’ов, не забудьте объявить их в `ai-skill-manifest.ts`.

## Шаг 4. Зарегистрировать навык в реестре

Файл: `src/shared/lib/ai/skills/index.ts`

```ts
const AI_SKILLS = {
  'blog-article-translation': blogArticleTranslationSkill,
  'article-summary': articleSummarySkill,
  'my-skill': mySkill
};
```

## Шаг 5. Использовать навык

Дальше можно использовать:

- либо `executeAiSkill()` на сервере;
- либо `useAiSkill()` в клиентском компоненте.

---

## Как вызвать навык на сервере

Если вы уже на сервере, чаще всего **не нужно** идти через HTTP на `/api/admin/ai/skills/:skillId`.

Лучше вызвать executor напрямую.

Пример:

```ts
import { executeAiSkill } from '@/shared/lib/ai/execute-ai-skill.server';
import type { ArticleSummaryResult } from '@/shared/lib/ai/skills/article-summary.contract';

const summary = await executeAiSkill<ArticleSummaryResult>('article-summary', {
  input: {
    content: markdown,
    maxSentences: 3
  },
  modelId: 'gpt-5.4-mini'
});
```

### Когда использовать прямой server-side вызов

- в route handler;
- в server action;
- в другом серверном сервисе;
- когда не нужен отдельный сетевой hop.

---

## Как вызвать навык из компонента

Если вызов идёт из client component, используйте `useAiSkill`.

### Базовый шаблон

```tsx
const { run, isPending, data, error, availableModels, descriptor } = useAiSkill<
  MySkillInput,
  MySkillResult
>({
  skillId: 'my-skill'
});
```

### Что можно использовать из хука

- `descriptor.label` — имя навыка;
- `descriptor.description` — описание навыка;
- `descriptor.promptSlots` — список slot’ов;
- `availableModels` — модели, разрешённые для этого навыка.

Это полезно для построения UI-конфигуратора навыка.

---

## Как выбрать модель

Есть три уровня выбора модели.

## 1. Глобальный каталог

Определяет все модели, вообще доступные в приложении.

Файл:

```text
src/shared/lib/ai/ai-model-catalog.ts
```

## 2. Манифест навыка

Ограничивает, какие модели доступны конкретному навыку.

Файл:

```text
src/shared/lib/ai/ai-skill-manifest.ts
```

## 3. Runtime-вызов

Позволяет выбрать модель при вызове:

```ts
await run({
  modelId: 'gpt-5.4-mini',
  input: { ... }
});
```

### Приоритет выбора модели

Итоговая модель выбирается так:

1. `modelId` из вызова;
2. `defaultModelId` slot’а;
3. `defaultModelId` навыка.

---

## Как работают prompt overrides

### Доступные поля

- `system` — полностью заменяет базовый системный prompt;
- `systemAppend` — дописывает текст к системному prompt;
- `prompt` — полностью заменяет основной prompt;
- `promptAppend` — дописывает текст к основному prompt.

### Пример полной замены prompt’а

```ts
await run({
  input: { ... },
  overrides: {
    content: {
      prompt: 'Переведи текст строго в академическом стиле:\n\n# Мой markdown'
    }
  }
});
```

### Пример безопасного дополнения

Обычно предпочтительнее `Append`, а не полная замена:

```ts
await run({
  input: { ... },
  overrides: {
    default: {
      systemAppend: 'Сохраняй терминологическую точность.'
    },
    content: {
      promptAppend: 'Удели особое внимание переводу цитат.'
    }
  }
});
```

### Рекомендация

Используйте полную замену `system` и `prompt` только если вы точно понимаете, что теряете встроенную бизнес-логику
навыка.

В большинстве случаев достаточно:

- `systemAppend`;
- `promptAppend`.

---

## Когда нужен `context`

Сейчас существующие навыки обходятся без `context`, но поле уже предусмотрено архитектурой.

`context` нужен, когда:

- часть данных не относится к основному `input`;
- нужно передать дополнительный runtime-контекст;
- навык должен зависеть от внешнего состояния, но не смешивать его с основным payload.

Пример возможного сценария:

- `input` — текст статьи;
- `context` — brand voice, словарь терминов, редакторские ограничения.

Если вводите `context`, добавляйте для него `contextSchema`.

---

## Рекомендации по проектированию навыков

### Делайте навык предметно-ориентированным

Хорошо:

- `blog-article-translation`
- `text-translation`
- `article-summary`
- `email-subject-rewrite`

Плохо:

- `universal-text-tool`
- `do-anything-with-text`

Причина простая: у предметного навыка:

- понятный контракт;
- понятный набор slot’ов;
- предсказуемая бизнес-логика;
- удобная валидация.

### Отделяйте контракт от реализации

Обязательно разделяйте:

- `*.contract.ts`
- `*-skill.ts`

Это делает код понятнее и облегчает переиспользование типов в UI.

### Держите модели в манифесте, а не в компонентах

Компонент не должен решать:

- какая модель допустима для задачи;
- какой slot существует;
- какие prompt override допустимы.

Компонент должен получать это из `descriptor` и `availableModels`.

### Не вызывайте `generateText` напрямую из UI-специфичных route handler’ов

Если задача уже оформлена как навык, route handler должен быть thin-wrapper.

Правильно:

```ts
const data = await executeAiSkill('blog-article-translation', { ... });
```

Неправильно:

- собирать prompt прямо в роуте;
- хардкодить модель в компоненте;
- дублировать системный prompt в нескольких местах.

---

## Рекомендации по выбору между `createAiSkill` и `createTextGenerationAiSkill`

Используйте `createTextGenerationAiSkill`, если:

- один AI-вызов;
- один результат;
- простая маппинг-логика.

Используйте `createAiSkill`, если:

- несколько slot’ов;
- несколько вызовов модели;
- нужна параллельная генерация;
- нужен постпроцессинг;
- нужна сложная сборка ответа.

---

## Разбор текущих встроенных навыков

## `blog-article-translation`

Назначение:

- перевод `title`;
- перевод `description`;
- перевод `content`.

Особенности:

- `title` и `description` переводятся как plain text;
- `content` переводится как markdown;
- для `content` используется более сильная модель по умолчанию;
- slot’ы можно переопределять отдельно.

## `article-summary`

Назначение:

- кратко суммаризировать markdown-статью.

Особенности:

- один slot `summary`;
- подходит как эталон простого навыка на базе `createTextGenerationAiSkill`.

## `text-translation`

Назначение:

- переводить произвольный текст;
- принимать сразу несколько целевых локалей;
- возвращать перевод для каждой запрошенной локали.

Особенности:

- один slot `translation`;
- навык требует строго сохранять исходное форматирование текста;
- для языков, где существуют и кириллица, и латиница, навык требует строго латиницу;
- навык запрещает придумывать несуществующие слова и требует использовать естественные синонимы, перефразирование или
  другие устойчивые формулировки для сохранения смысла.

Пример server-side вызова:

```ts
import { executeAiSkill } from '@/shared/lib/ai/execute-ai-skill.server';
import type { TextTranslationResult } from '@/shared/lib/ai/skills/text-translation.contract';

const result = await executeAiSkill<TextTranslationResult>('text-translation', {
  input: {
    sourceLocale: 'ru',
    targetLocales: ['en', 'sr'],
    text: '# Заголовок\n\nТекст с форматированием'
  },
  modelId: 'gpt-5.4'
});
```

Форма результата:

```ts
{
  sourceLocale: 'ru',
  translations: [
    { locale: 'en', text: '# Title\n\nFormatted text' },
    { locale: 'sr', text: '# Naslov\n\nFormatiran tekst' }
  ]
}
```

---

## Частые сценарии

## Сценарий 1. Нужен новый AI-кнопочный action в админке

Рекомендация:

1. оформить задачу как новый skill;
2. добавить контракт;
3. добавить skill в manifest;
4. вызвать через `useAiSkill`.

## Сценарий 2. Нужен AI в роуте

Рекомендация:

1. не писать новый `generateText` в роуте;
2. использовать существующий skill или добавить новый;
3. вызывать через `executeAiSkill`.

## Сценарий 3. Нужна настройка prompt’а без изменения skill’а

Рекомендация:

использовать `overrides`, а не копировать skill.

---

## Чего делать не нужно

- не хардкодить provider model id в компонентах;
- не собирать prompt руками в каждом route handler;
- не дублировать одну и ту же prompt-логику в двух skill’ах;
- не использовать один skill для слишком разных задач;
- не обходить `inputSchema` и `outputSchema`.

---

## Технические требования

Для server-side вызовов нужен:

```env
AI_GATEWAY_API_KEY=...
```

Если переменная не задана, executor вернёт `AiSkillConfigurationError`, а API ответит `503`.

---

## Минимальный чек-лист при добавлении нового навыка

1. Создан `*.contract.ts`.
2. Добавлен `skillId` в `AI_SKILL_IDS`.
3. Добавлен descriptor в `AI_SKILL_MANIFEST`.
4. Реализован skill через `createAiSkill` или `createTextGenerationAiSkill`.
5. Навык зарегистрирован в `skills/index.ts`.
6. При необходимости добавлен UI через `useAiSkill`.
7. При необходимости добавлен thin-wrapper route.
8. Прогнан `npm run type-check`.

---

## Куда смотреть в первую очередь

Если нужно быстро понять систему, начните с этих файлов:

1. `src/shared/lib/ai/ai-skill-manifest.ts`
2. `src/shared/lib/ai/ai-skill-factory.ts`
3. `src/shared/lib/ai/execute-ai-skill.server.ts`
4. `src/shared/lib/ai/hooks/use-ai-skill.ts`
5. `src/shared/lib/ai/skills/blog-article-translation-skill.ts`

Этого достаточно, чтобы:

- добавить новый skill;
- подключить его к UI;
- подключить его к route handler’у;
- понять, как работают модели и prompt overrides.
