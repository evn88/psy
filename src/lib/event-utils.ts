/**
 * Диапазон дат для проверки пересечений календарных событий.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Проверяет, что диапазон дат является валидным и не вырожденным.
 * @param range - проверяемый диапазон
 * @returns `true`, если `start` строго раньше `end`
 */
export const isValidDateRange = ({ start, end }: DateRange): boolean => {
  return start.getTime() < end.getTime();
};

/**
 * Проверяет пересечение двух диапазонов дат.
 * @param left - первый диапазон
 * @param right - второй диапазон
 * @returns `true`, если диапазоны пересекаются
 */
export const doesDateRangeOverlap = (left: DateRange, right: DateRange): boolean => {
  return left.start < right.end && left.end > right.start;
};
