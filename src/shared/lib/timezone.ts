/**
 * Проверяет корректность IANA timezone через Intl API.
 * @param value - произвольный идентификатор timezone.
 * @returns `true`, если timezone поддерживается средой выполнения.
 */
export const isValidTimeZone = (value: string): boolean => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalizedValue }).format(new Date());
    return true;
  } catch {
    return false;
  }
};
