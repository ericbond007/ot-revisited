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

/**
 * Advance a calendar date by `n` days, correctly rolling over
 * month and year boundaries (leap-year aware). Returns a new
 * GameDate; `from` is not mutated. Used by the projected-arrival
 * chip (#1304-T5) to convert a journey-day count back to a
 * calendar date.
 */
export function addDaysToDate(from: GameDate, n: number): GameDate {
  const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let { year, month, day } = from;
  let remaining = Math.round(n); // journey days are integers
  while (remaining > 0) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const cap = month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1];
    const daysLeftInMonth = cap - day;
    if (remaining <= daysLeftInMonth) {
      day += remaining;
      remaining = 0;
    } else {
      remaining -= daysLeftInMonth + 1; // +1 to step to the 1st of next month
      day = 1;
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
  }
  return { year, month, day };
}

export function isSunday(date: GameDate): boolean {
  return dayOfWeek(date) === 0;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function dayName(date: GameDate): string {
  return DAY_NAMES[dayOfWeek(date)];
}
