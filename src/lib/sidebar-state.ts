export const SIDEBAR_COOKIE_NAME = 'sidebar_state';
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Определяет начальное состояние sidebar по сохранённому значению cookie.
 * При первом посещении меню раскрыто, явное значение `false` сохраняет свёрнутое состояние.
 */
export const getDefaultSidebarOpen = (value: string | undefined): boolean => value !== 'false';
