# Правила работы с датами и часовыми поясами расписания

Этот документ обязателен для разработчиков и AI-агентов, которые изменяют расписание, консультации, личный кабинет,
админский календарь, email-уведомления или Pillo.

## Единая точка истины

Все операции с датой и временем расписания выполняются через:

- `src/lib/schedule-timezone.ts` — платформонезависимый shared-сервис;
- `src/lib/hooks/use-schedule-date-time.ts` — React-хук для Client Components.

Основной API:

```ts
const dateTime = createScheduleDateTime({ timeZone, locale });

dateTime.format(instant, 'dateTime');
dateTime.formatIntl(instant, options);
dateTime.formatRange(start, end);
dateTime.getDateKey(instant);
dateTime.toCalendarDate(instant);
dateTime.fromCalendarDate(calendarDate);
dateTime.getLocalDateTimeFields(start, end);
dateTime.fromLocalDateTime({ date, startTime, duration });
dateTime.getUtcOffset(instant);
```

В Client Components вместо прямого создания сервиса используется:

```ts
const dateTime = useScheduleDateTime(timeZone, locale);
```

## Обязательные правила

1. Сначала определить, чьё локальное время отображается:
   - календарь и форма администратора — `adminTimezone`;
   - личный кабинет клиента — timezone клиента;
   - preview, tooltip и уведомление о клиенте — timezone клиента;
   - серверный код, email и workflow — timezone пользователя, переданный в сервис.
2. Часовой пояс всегда нормализуется через `resolveScheduleTimeZone`. Нельзя самостоятельно подставлять fallback или
   проверять IANA timezone в компоненте.
3. Моменты, хранимые и передаваемые API, остаются абсолютными UTC-моментами (`Date`/ISO). Локализация выполняется только
   на границе отображения или ввода.
4. Локальные поля формы (`date`, `startTime`, `duration`) преобразуются в UTC только через
   `dateTime.fromLocalDateTime(...)`. Результат нужно проверить по `success`; при `INVALID_LOCAL_TIME` показать ошибку,
   а не сохранять автоматически скорректированное время.
5. Для календарной сетки используются только `toCalendarDate` и `fromCalendarDate`. Для даты события, ключа дня,
   времени, интервала и UTC-смещения используются соответствующие методы сервиса.
6. Новая операция с датой расписания сначала добавляется в shared-сервис, после чего используется потребителями. Нельзя
   создавать локальные `formatScheduleDate`, `getClientOffset`, `parseInTimezone` и аналогичные дубликаты.

## Запрещённые подходы

В потребителях расписания запрещены:

- прямые импорты `date-fns-tz` (`formatInTimeZone`, `fromZonedTime`, `toZonedTime` и т. п.);
- ручные вызовы `Intl.DateTimeFormat` с `timeZone` для расчёта или форматирования расписания;
- `toLocaleString`, `toLocaleDateString` и арифметика смещения часовых поясов вручную;
- конструирование локального времени через строки и `new Date(...)` вместо `fromLocalDateTime`;
- сравнение или группировка событий по системному timezone браузера/сервера.

`date-fns` можно использовать только для структурной навигации по уже подготовленной календарной дате (`addDays`,
`startOfWeek`, `isSameDay` и подобные операции). Преобразование абсолютного момента, форматирование timezone и расчёт
границ запроса выполняются shared-сервисом.

## Date-only поля

Поля, которые являются бизнес-датой без времени (например, дата окончания курса Pillo), нельзя трактовать как момент
события и бездумно конвертировать в timezone. Нужно сохранить их доменную семантику и использовать явно выбранный
стабильный timezone/формат через shared-сервис.

## Проверка изменений

При изменении логики расписания AI-агент обязан:

- проверить все новые импорты `date-fns-tz`, `Intl.DateTimeFormat`, `toLocale*` и ручную арифметику времени;
- добавить или обновить тесты для обычного времени, разных timezone, перехода на летнее/зимнее время и некорректного
  timezone;
- проверить TypeScript, ESLint и релевантные Vitest-тесты;
- убедиться, что admin/client preview показывают один и тот же абсолютный момент в разных локальных timezone.

Если текущего API недостаточно, сначала расширить `schedule-timezone.ts`, затем мигрировать потребителей. Обход shared-
сервиса без явного обоснования запрещён.
