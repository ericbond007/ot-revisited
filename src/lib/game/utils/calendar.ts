import type { GameDate } from '../types';

// Day-of-week helpers for the Gregorian-calendar dates the game uses.
// JS Date construction with year/month/day uses the proleptic Gregorian
// calendar back through the trail era (1843+), and getDay() is locale-
// independent for the date itself (only the time-of-day shifts with
// timezone — we never set a time, so noon-local is fine everywhere).

/** 0 = Sunday, 1 = Monday, ..., 6 = Saturday. */
export function dayOfWeek(date: GameDate): number {
  return new Date(date.year, date.month - 1, date.day).getDay();
}

export function isSunday(date: GameDate): boolean {
  return dayOfWeek(date) === 0;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function dayName(date: GameDate): string {
  return DAY_NAMES[dayOfWeek(date)];
}
