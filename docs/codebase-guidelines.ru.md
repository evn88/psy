# Архитектура проекта и правила размещения кода

Это базовый документ для всех разработчиков, которые добавляют новый код в проект `vershkov`.

Цель документа:

- сохранить единообразную структуру репозитория;
- не смешивать route-level код, общие компоненты и бизнес-логику;
- снизить количество случайных дубликатов;
- упростить навигацию по проекту;
- сделать код предсказуемым для следующего разработчика.

Документ опирается на текущую структуру проекта и на практики Next.js App Router.

---

## 1. Главный принцип

В проекте не используется FSD.

Мы придерживаемся модели:

- `src/app` — маршруты, layouts, route handlers, route-level UI и route-level server actions;
- `src/components` — переиспользуемые UI-компоненты и провайдеры, не привязанные к одному маршруту;
- `src/lib` — общие утилиты, конфиги, хелперы, клиентские общие хуки;
- `src/modules` — доменная и серверная бизнес-логика, которую используют разные части приложения;
- `src/types` — общие типы верхнего уровня;
- `src/styles` — глобальные и крупные shared-стили;
- `src/emails` — email-шаблоны;
- `src/workflows` — workflow-функции верхнего уровня.

Правило:
Если код нужен только одному маршруту или одному экрану, держим его рядом с этим маршрутом.

Если код нужен в нескольких несвязанных местах, выносим его в `components`, `lib` или `modules` в зависимости от роли.

---

## 2. Как устроен `src/app`

### 2.1 Что хранится в `app`

В `src/app` находятся:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `default.tsx`
- `template.tsx`
- `route.ts`
- route-level `_components`
- route-level `_hooks`
- route-level `_actions`
- route-level локальные утилиты и типы

Примеры из проекта:

- `src/app/[locale]/(dashboard)/app/pillo/page.tsx`
- `src/app/[locale]/(dashboard)/app/pillo/_components/PilloAppShell.tsx`
- `src/app/[locale]/(dashboard)/app/pillo/_hooks/use-pillo-tabs.ts`
- `src/app/[locale]/(dashboard)/my/data/_actions/documents.actions.ts`
- `src/app/[locale]/(admin)/admin/blog/[id]/_components/blog-editor-form.types.ts`

### 2.2 Что нельзя складывать в `app`

Не нужно хранить в `app`:

- общий UI, используемый по всему проекту;
- абстрактные утилиты без привязки к маршруту;
- доменные сервисы и серверную бизнес-логику, которую используют разные роуты;
- общие типы проекта.

Если файл начинает использоваться в нескольких удалённых друг от друга зонах, это сигнал вынести его выше.

---

## 3. Именование файлов

### 3.1 Компоненты React

Для новых продуктовых React-компонентов стандартом проекта считается `PascalCase`.

Примеры:

- `ProfileForm.tsx`
- `ThemeProvider.tsx`
- `PilloAppShell.tsx`
- `AdminPaymentsTable.tsx`
- `TakeConfirmation.tsx`

Это правило действует для:

- общих компонентов в `src/components`;
- route-level компонентов в `src/app/**/_components`;
- компонентных файлов в `src/modules/**/components`;
- email-шаблонов в `src/emails`;
- большинства route-level компонентов страниц, форм, карточек, диалогов и client shells.

Важно:
В репозитории уже есть legacy-исключения, которые пока существуют исторически и не должны автоматически переписываться без отдельной задачи:

- low-level primitives в `src/components/ui`, например `button.tsx`, `dialog.tsx`, `form.tsx`;
- отдельные инфраструктурные entrypoint-файлы, например `src/components/providers.tsx`;
- часть старых публичных секций, например `src/app/[locale]/(public)/_components/landing/about.tsx`.

Правило для новой разработки:

- если это продуктовый компонент уровня страницы, feature, диалога, карточки, таблицы или формы, используйте `PascalCase`;
- если это low-level primitive или технический glue-file, сначала следуйте существующему локальному паттерну папки.

### 3.2 Исключения для Next.js file conventions

Следующие файлы обязаны оставаться в нижнем регистре по правилам Next.js:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `default.tsx`
- `template.tsx`
- `route.ts`
- `icon.*`
- `apple-icon.*`
- `manifest.ts`
- `robots.ts`
- `sitemap.ts`

Их нельзя переименовывать в `PascalCase`.

### 3.3 Хуки

Файлы хуков должны называться в `kebab-case` и начинаться с `use-`.

Примеры:

- `use-mobile.tsx`
- `use-heartbeat.ts`
- `use-push-notifications.ts`
- `use-user-events.ts`
- `use-pillo-tabs.ts`
- `use-blog-editor-lock.ts`

Правило:
Если файл экспортирует React hook как основную сущность, имя файла должно начинаться с `use-`.

### 3.4 Утилиты, схемы, константы и типы

Не-компонентные файлы должны использовать `kebab-case`.

Примеры:

- `blog-utils.ts`
- `safe-url.ts`
- `calendar-utils.ts`
- `form-field-utils.ts`
- `blog-editor.schema.ts`
- `blog-editor-form.types.ts`
- `blog-editor-form.constants.ts`
- `providers.tsx` для технического composition entrypoint как осознанное исключение

### 3.5 CSS и CSS Modules

CSS-файлы не переводятся в `PascalCase`.

Используем:

- `globals.css`
- `blog-article.css`
- `hero.module.css`
- `dev-banner.module.css`

Правило:
Имена CSS-файлов должны описывать зону ответственности, а не название JSX-компонента в обязательном `PascalCase`.

---

## 4. Правила по папкам

### 4.1 `src/components`

Сюда кладём только общие компоненты, которые:

- не привязаны к одному маршруту;
- переиспользуются в нескольких местах;
- представляют собой shared UI или shared providers.

Примеры:

- `src/components/ProfileForm.tsx`
- `src/components/ThemeProvider.tsx`
- `src/components/SidebarWorkspaceLayout.tsx`
- `src/components/providers.tsx`
- `src/components/ui/*`
- `src/components/pwa/*`

Когда класть сюда:

- компонент нужен и в `admin`, и в `my`;
- компонент нужен нескольким страницам;
- компонент не зависит от одной конкретной route tree.

Когда не класть сюда:

- компонент обслуживает один экран;
- компонент содержит логику только конкретного route segment;
- компонент нужен только внутри одного feature-screen.

### 4.2 `src/components/ui`

Это слой базовых примитивов UI.

Сюда относятся:

- кнопки;
- диалоги;
- селекты;
- таблицы;
- инпуты;
- dropdown/menu primitives;
- form primitives.

Примеры:

- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/sidebar.tsx`

Правило:
`ui` — это не место для бизнес-логики. Здесь должны жить только базовые, максимально нейтральные визуальные примитивы и thin wrappers над Radix/shadcn-паттернами.

Правило именования для `src/components/ui`:

- сохраняем существующий локальный стиль папки;
- новые примитивы в этой папке называем так же, как уже названы соседние файлы;
- не вводим внутри `ui` смешанный стиль без причины.

### 4.3 `src/components/pwa`

Сюда выносим shared PWA-инфраструктуру:

- service worker registration;
- offline indicator;
- push-permission banner;
- shared push settings.

Если код касается PWA в целом, а не одного маршрута, его место здесь.

### 4.4 `src/components/mdx-editor`

Подпапка внутри `components` допустима, если это отдельная shared подсистема.

Хороший признак для подпапки:

- внутри есть 2+ связанных файла;
- есть внутренняя композиция;
- подсистема переиспользуется как единый блок.

---

## 5. Правила для route-level кода в `app`

### 5.1 `_components`

Папка `_components` внутри маршрута предназначена для компонентов, которые нужны только этой ветке маршрута.

Примеры:

- `src/app/[locale]/(dashboard)/app/pillo/_components/*`
- `src/app/[locale]/(dashboard)/my/sessions/_components/*`
- `src/app/[locale]/(admin)/admin/schedule/_components/*`
- `src/app/[locale]/(public)/blog/_components/*`

Что хранить в `_components`:

- локальные формы;
- секции страницы;
- локальные диалоги;
- route-specific таблицы;
- route-specific cards;
- route-specific client shells.

Что не хранить в `_components`:

- общие утилиты проекта;
- универсальные layout primitives;
- shared buttons/inputs/dialog wrappers;
- доменные сервисы.

### 5.2 `_hooks`

Папка `_hooks` нужна для route-level hook-логики.

Примеры:

- `src/app/[locale]/(dashboard)/app/pillo/_hooks/use-pillo-tabs.ts`
- `src/app/[locale]/(dashboard)/app/pillo/_hooks/use-pillo-settings-form.ts`

Туда кладём hooks, если они:

- используются только этим экраном или этой route subtree;
- завязаны на локальный UI state, локальный query flow или локальную форму;
- не имеют смысла вне этого экрана.

Если hook становится полезен в нескольких подсистемах, нужно перенести его в:

- `src/lib/hooks`, если он общий инфраструктурно;
- `src/modules/<domain>/hooks`, если он доменный;
- `src/components/<subsystem>`, если он относится к shared компонентной подсистеме.

### 5.3 `_actions`

Папка `_actions` используется для route-level server actions.

Пример:

- `src/app/[locale]/(dashboard)/my/data/_actions/documents.actions.ts`

Туда кладём server actions, если они:

- используются только одной страницей или одной route subtree;
- тесно связаны с конкретным UI flow.

Если action начинает использоваться разными зонами, бизнес-логику нужно выносить в `modules` или `lib`, а в action оставлять тонкий orchestration layer.

### 5.4 Локальные вспомогательные файлы рядом с экраном

Рядом с `_components` допустимо хранить:

- `types.ts`
- `*.types.ts`
- `*.schema.ts`
- `*.constants.ts`
- `*.actions.ts`
- `*.utils.ts`

Примеры:

- `blog-editor-form.types.ts`
- `blog-editor.schema.ts`
- `blog-editor-form.constants.ts`
- `calendar-utils.ts`
- `types.ts`

Правило:
Если файл нужен только конкретному экрану, не нужно поднимать его в `lib`.

---

## 6. Где хранить хуки

### 6.1 `src/lib/hooks`

Здесь живут общие клиентские хуки проекта.

Примеры:

- `src/lib/hooks/use-mobile.tsx`
- `src/lib/hooks/use-heartbeat.ts`
- `src/lib/hooks/use-push-notifications.ts`
- `src/lib/hooks/use-survey-sync.ts`

Сюда помещаем hook, если он:

- не относится к одному маршруту;
- описывает общую инфраструктурную или прикладную механику;
- потенциально может переиспользоваться в разных местах.

### 6.2 `src/modules/<domain>/hooks`

Если hook относится к конкретному домену, но не к одному экрану, его место внутри доменного модуля.

Пример:

- `src/modules/ai/hooks/use-ai-skill.ts`

Это хороший выбор, когда hook:

- завязан на доменную модель;
- используется несколькими компонентами внутри домена;
- не является просто route-level UI helper.

### 6.3 `src/app/**/_hooks`

Если hook нужен только конкретной route subtree, не выносите его преждевременно.

Пример:

- `src/app/[locale]/(dashboard)/app/pillo/_hooks/use-pillo-medication-form.ts`

### 6.4 Чего не делать

Нельзя:

- складывать все хуки подряд в `src/lib/hooks` без разбора;
- хранить глобальный доменный hook рядом с одной страницей;
- выносить локальный hook в `lib` только потому, что так короче импорт;
- держать hook внутри `components/ui`, если это не внутренняя часть примитива.

---

## 7. Где хранить бизнес-логику

### 7.1 `src/modules`

`src/modules` — это место для доменной логики.

Примеры доменов в проекте:

- `modules/ai`
- `modules/backup`
- `modules/payments`
- `modules/pillo`
- `modules/system-logs`

Сюда кладём:

- сервисы;
- доменные типы;
- доменные фабрики;
- серверную бизнес-логику;
- workflow adapters;
- доменные тесты;
- иногда доменные React-компоненты.

Примеры:

- `src/modules/backup/service.ts`
- `src/modules/pillo/schedule.ts`
- `src/modules/payments/factory.ts`
- `src/modules/system-logs/system-log-service.server.ts`

### 7.2 Когда использовать `modules`, а не `lib`

Используем `modules`, если код:

- описывает конкретную бизнес-область;
- имеет собственные сущности и правила;
- используется из нескольких маршрутов;
- содержит не просто helper, а доменное поведение.

Используем `lib`, если код:

- инфраструктурный;
- утилитарный;
- конфигурационный;
- не является самостоятельным доменом.

Сравнение:

- `src/lib/safe-url.ts` — общий helper;
- `src/modules/pillo/schedule.ts` — доменная логика расписания;
- `src/lib/prisma.ts` — инфраструктурный доступ к Prisma;
- `src/modules/backup/workflow.ts` — доменная orchestration-логика backup.

---

## 8. Где хранить общие утилиты и инфраструктуру

### 8.1 `src/lib`

`lib` — это shared foundation проекта.

Сюда входят:

- общие утилиты;
- shared server helpers;
- общие конфиги;
- интеграции;
- инфраструктурные обвязки;
- shared actions/helpers, не привязанные к одному route segment.

Примеры:

- `src/lib/prisma.ts`
- `src/lib/email.ts`
- `src/lib/theme.ts`
- `src/lib/seo.ts`
- `src/lib/blog-utils.ts`
- `src/lib/session-reminders.ts`
- `src/lib/config/*`

### 8.2 Подпапка `src/lib/config`

Любые общие конфиги верхнего уровня кладём в `src/lib/config`.

Примеры:

- `src/lib/config/auth.ts`
- `src/lib/config/backup.ts`
- `src/lib/config/files.ts`
- `src/lib/config/intake.ts`

Не нужно размазывать общие константы по случайным компонентам или страницам.

### 8.3 Серверные файлы

Если файл server-only, это должно быть понятно из контекста или имени.

В проекте уже используется pattern:

- `*.server.ts`

Примеры:

- `system-log-service.server.ts`
- `with-api-logging.server.ts`
- `execute-ai-skill.server.ts`

Правило:
Если модуль нельзя безопасно импортировать на клиент, лучше явно пометить это именем файла.

---

## 9. Где хранить типы

### 9.1 Локальные типы

Если тип нужен только одному экрану или одной подсистеме, держим его рядом.

Примеры:

- `blog-editor-form.types.ts`
- `src/app/[locale]/(admin)/admin/users/_components/types.ts`
- `src/app/[locale]/(dashboard)/app/pillo/_components/types.ts`

### 9.2 Общие типы

Если тип нужен в нескольких разных зонах проекта и не принадлежит одному домену, его место в `src/types`.

Примеры:

- `src/types/blog.ts`
- `src/types/tar-stream.d.ts`

### 9.3 Доменные типы

Если тип относится к конкретному домену, он должен жить в доменном модуле.

Примеры:

- `src/modules/payments/types.ts`
- `src/modules/backup/types.ts`

Правило:
Не создавайте гигантскую общую свалку типов.

---

## 10. Где хранить стили

### 10.1 Публичные страницы

Для публичных страниц сайта используем CSS Modules.

Примеры:

- `hero.module.css`
- `dev-banner.module.css`
- `services.module.css`

Обычно такой файл лежит рядом с route-level компонентом.

### 10.2 Админка и личный кабинет

Для `admin` и `my` по умолчанию используем `shadcn/ui` + Tailwind CSS utility classes.

CSS Modules здесь не первый выбор.

### 10.3 Глобальные стили

Глобальные стили и theme tokens живут в:

- `src/app/globals.css`
- `src/styles/*`, если это shared stylesheet

Примеры:

- `src/styles/blog-article.css`
- `src/styles/landing/landing.module.css`

---

## 11. Где хранить email-шаблоны

Все email-компоненты живут в `src/emails`.

Имена файлов:

- в `PascalCase`;
- с явным смыслом;
- без route-level привязки.

Примеры:

- `VerificationEmailTemplate.tsx`
- `AdminMessageTemplate.tsx`
- `BlogNotificationTemplate.tsx`

Нельзя хранить email JSX внутри `app`, `components/ui` или `modules`, если это именно письмо, а не кусок общей бизнес-логики.

---

## 12. Где хранить workflow-файлы

Верхнеуровневые workflow entrypoints живут в `src/workflows`.

Примеры:

- `create-site-backup-workflow.ts`
- `restore-site-backup-workflow.ts`
- `session-reminder-workflow.ts`
- `pillo-intake-reminder-workflow.ts`

Если модуль домена лишь вызывает workflow, адаптер можно держать в домене или `lib`, но точка входа workflow должна оставаться в `src/workflows`.

---

## 13. Как принимать решение, куда положить новый файл

Используйте такой порядок вопросов:

1. Это специальный Next.js файл маршрута?
   Тогда место в `src/app/...`.

2. Это UI, нужный только одной странице или route subtree?
   Тогда место рядом с маршрутом в `_components`.

3. Это hook, нужный только одному экрану?
   Тогда место в `src/app/**/_hooks`.

4. Это server action только для одного route flow?
   Тогда место в `src/app/**/_actions`.

5. Это переиспользуемый UI-компонент?
   Тогда место в `src/components`.

6. Это базовый UI primitive?
   Тогда место в `src/components/ui`.

7. Это общий helper, config или инфраструктурный модуль?
   Тогда место в `src/lib`.

8. Это доменная логика со своей бизнес-областью?
   Тогда место в `src/modules/<domain>`.

9. Это общий тип верхнего уровня?
   Тогда место в `src/types`.

Если после этих вопросов ответ неочевиден, почти всегда лучше начать с колокации рядом с маршрутом и выносить выше только после появления реального переиспользования.

---

## 14. Правила против дубликатов

Перед созданием нового файла обязательно проверьте:

- нет ли уже похожего shared-компонента в `src/components`;
- нет ли уже похожего hook в `src/lib/hooks` или `src/modules/*/hooks`;
- нет ли доменной логики в `src/modules/<domain>`;
- не существует ли уже local helper рядом с маршрутом;
- не копируете ли вы типы, которые уже лежат рядом с feature.

Правило:
Сначала переиспользуем существующий механизм, потом создаём новый.

---

## 15. Что считается плохой организацией

Плохо:

- класть route-specific компонент в `src/components`, если он нужен одной странице;
- класть общий shared helper в `_components`;
- хранить доменную серверную логику прямо в `page.tsx`;
- создавать generic helper внутри одного route, если он уже стал общим;
- смешивать UI, server actions и утилиты в одном огромном файле;
- выносить локальный код в верхний уровень без реальной причины;
- складывать произвольные типы в один глобальный `types.ts`;
- создавать новые папки верхнего уровня без архитектурной причины.

---

## 16. Минимальные соглашения по именам

### Компоненты

- для продуктовых компонентов: `PascalCase.tsx`
- имя файла должно совпадать с главным экспортируемым компонентом
- для low-level primitives и специальных инфраструктурных entrypoints сначала смотрим на локальный паттерн папки

Хорошо:

- `ProfileForm.tsx`
- `BlogHeader.tsx`
- `button.tsx` внутри `src/components/ui`, если это primitive и он следует существующему слою

Плохо:

- `profile-form.tsx`
- `component.tsx`
- `index.tsx` для основного компонента без причины

### Хуки

- `use-*.ts` или `use-*.tsx`

Хорошо:

- `use-mobile.tsx`
- `use-pillo-tabs.ts`

### Утилиты

- `kebab-case.ts`

Хорошо:

- `safe-url.ts`
- `calendar-utils.ts`

### Типы

- `*.types.ts` для группы локальных типов;
- `types.ts` для небольшого локального набора типов внутри одной папки;
- доменные типы рядом с доменом;
- общие типы в `src/types`.

### Константы

- `*.constants.ts`, если это локальный набор констант для feature;
- `src/lib/config/*.ts`, если это shared config уровня проекта;
- `constants.ts` внутри домена, если это доменные константы.

---

## 17. Практический шаблон для новой feature

Если вы добавляете новый route-level экран, обычно структура должна быть такой:

```text
src/app/[locale]/(dashboard)/my/example/
  page.tsx
  loading.tsx
  actions.ts
  _components/
    ExamplePageClient.tsx
    ExampleTable.tsx
    ExampleDialog.tsx
    example-form.schema.ts
    example-form.types.ts
  _hooks/
    use-example-filters.ts
  _actions/
    example.actions.ts
```

Если потом:

- `ExampleDialog` начинает использоваться ещё в двух местах, переносим его в `src/components`;
- `use-example-filters` нужен разным зонам домена, переносим его в `src/modules/<domain>/hooks`;
- `example.actions.ts` содержит общую бизнес-логику, выносим эту бизнес-логику в `src/modules/<domain>` или `src/lib`, а action оставляем тонким слоем вызова.

---

## 18. Краткий итог

Запомнить нужно следующее:

- маршруты и локальный экранный код живут в `src/app`;
- shared UI живёт в `src/components`;
- базовые UI primitives живут в `src/components/ui`;
- общие инфраструктурные helper-файлы живут в `src/lib`;
- доменная бизнес-логика живёт в `src/modules`;
- глобальные типы живут в `src/types`;
- компоненты называются в `PascalCase`;
- хуки и утилиты называются в `kebab-case`;
- специальные Next.js файлы не переименовываются;
- сначала используем колокацию, потом выносим в shared только при реальном переиспользовании.

Если новый код не укладывается в эту схему, сначала нужно объяснить архитектурную причину отклонения, а не добавлять файл “куда удобно”.
