export const PILLO_REMINDER_WINDOW_HOURS = 48;
export const PILLO_MISSED_GRACE_HOURS = 24;
export const PILLO_ACTION_TOKEN_TTL_HOURS = 48;
export const PILLO_DEFAULT_TIMEZONE = 'UTC';
export const PILLO_MIN_TIME = '00:00';
export const PILLO_MAX_TIME = '23:59';

export const PILLO_WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export type PilloIsoWeekDay = (typeof PILLO_WEEK_DAYS)[number];
