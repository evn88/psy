/** Максимальное количество записей в истории входов на пользователя */
export const MAX_LOGIN_HISTORY = 10;

/** Максимальное количество попыток входа с одного email + IP за окно */
export const MAX_LOGIN_ATTEMPTS_PER_EMAIL_AND_IP = 5;

/** Максимальное количество попыток входа с одного IP за окно */
export const MAX_LOGIN_ATTEMPTS_PER_IP = 20;

/** Временное окно для подсчёта попыток входа (мс) */
export const LOGIN_ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 час
