/**
 * Преобразует значение даты формы в части для отдельных селектов.
 * @param value - дата в формате `yyyy-MM-dd`.
 * @returns Части даты для года, месяца и дня.
 */
export const parseDateParts = (value: string | null | undefined) => {
  if (!value) {
    return { year: '', month: '', day: '' };
  }

  const [year = '', month = '', day = ''] = value.split('-');

  return { year, month, day };
};

/**
 * Собирает строку даты из частей селектов.
 * @param params - год, месяц и день.
 * @returns Строка даты `yyyy-MM-dd` или `null`, если данные неполные.
 */
export const formatDateParts = ({
  year,
  month,
  day
}: {
  year: string;
  month: string;
  day: string;
}) => {
  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

/**
 * Подгоняет день под максимальное число дней выбранного месяца.
 * @param params - год, месяц и текущий день.
 * @returns Валидный день с ведущим нулём.
 */
export const normalizeDayForMonth = ({
  year,
  month,
  day
}: {
  year: string;
  month: string;
  day: string;
}) => {
  if (!day) {
    return day;
  }

  const maxDay = getDaysInMonth({ year, month });
  const dayNumber = Number(day);

  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return '';
  }

  return String(Math.min(dayNumber, maxDay)).padStart(2, '0');
};

/**
 * Возвращает корректное число дней в выбранном месяце.
 * @param params - год и месяц.
 * @returns Количество дней в месяце.
 */
export const getDaysInMonth = ({ year, month }: { year: string; month: string }) => {
  const yearNumber = Number(year);
  const monthNumber = Number(month);

  if (!Number.isInteger(yearNumber) || !Number.isInteger(monthNumber) || monthNumber < 1) {
    return 31;
  }

  return new Date(yearNumber, monthNumber, 0).getDate();
};

/**
 * Преобразует значение времени формы в части для отдельных селектов.
 * @param value - время в формате `HH:mm`.
 * @returns Части времени для часов и минут.
 */
export const parseTimeParts = (value: string | null | undefined) => {
  if (!value) {
    return { hour: '', minute: '' };
  }

  const [hour = '', minute = ''] = value.split(':');

  return { hour, minute };
};

/**
 * Собирает строку времени из частей селектов.
 * @param params - часы и минуты.
 * @returns Строка времени `HH:mm` или `null`, если данные неполные.
 */
export const formatTimeParts = ({ hour, minute }: { hour: string; minute: string }) => {
  if (!hour || !minute) {
    return null;
  }

  return `${hour}:${minute}`;
};

/**
 * Создаёт массив строковых числовых значений с ведущими нулями.
 * @param params - диапазон значений.
 * @returns Набор опций для селектов.
 */
export const createPaddedNumberRange = ({ start, end }: { start: number; end: number }) => {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    return String(start + index).padStart(2, '0');
  });
};
