const normalizeSearchValue = (value: string): string =>
  value.toLocaleLowerCase().replaceAll('_', ' ').replaceAll('/', ' ');

/**
 * Возвращает поддерживаемые окружением IANA-таймзоны с гарантированным UTC.
 * @returns Отсортированный список идентификаторов часовых поясов.
 */
export const getSupportedTimeZones = (): string[] => {
  try {
    const timezones = Intl.supportedValuesOf('timeZone');
    return ['UTC', ...timezones.filter(timezone => timezone !== 'UTC')];
  } catch {
    return ['UTC'];
  }
};

/**
 * Форматирует технический IANA-идентификатор для отображения пользователю.
 * @param timezone - IANA-идентификатор часового пояса.
 * @returns Читаемая строка региона и города.
 */
export const formatTimeZoneLabel = (timezone: string): string => timezone.replaceAll('_', ' ');

/**
 * Фильтрует часовые пояса по городу, региону или полному идентификатору.
 * @param timezones - исходный список часовых поясов.
 * @param query - поисковая строка.
 * @returns Отфильтрованный список.
 */
export const filterTimeZones = (timezones: string[], query: string): string[] => {
  const normalizedQuery = normalizeSearchValue(query.trim());

  if (!normalizedQuery) {
    return timezones;
  }

  return timezones.filter(timezone => normalizeSearchValue(timezone).includes(normalizedQuery));
};
