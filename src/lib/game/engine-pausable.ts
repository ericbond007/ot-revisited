import type { GameState } from './types';
import { makeRng } from './rng';
import { upgradeState } from './upgrade';
import { applyDailyConsumption } from './systems/consumption';
import { progressConditions } from './systems/conditions';
import { tickOxen } from './systems/oxen';
import { tickWagon } from './systems/wagon';
import { adjustMorale } from './systems/morale';
import { applyTravel } from './systems/travel';
import { rollEvent, resolveEvent } from './systems/events';
import { attemptFire } from './systems/fire';
import { reapDead } from './systems/death';
import type { GameEvent } from './content/events';

function advanceDate(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

export interface PausableTickResult {
  state: GameState;
  pendingEvent?: GameEvent;
}

export function tickDayPausable(state: GameState): PausableTickResult {
  const normalized = upgradeState(state);
  const rng = makeRng(`${normalized.seed}:${normalized.day}`);

  let s = progressConditions(normalized, rng);
  s = applyDailyConsumption(s);
  s = tickOxen(s, rng);
  s = tickWagon(s, rng);
  s = adjustMorale(s, rng);
  s = applyTravel(s, rng);

  // Check event WITHOUT resolving. If cooldown allows, roll; if one fires, pause here.
  if (s.flags._lastEventDay !== s.day) {
    const pending = rollEvent(s, rng);
    if (pending) {
      return { state: s, pendingEvent: pending };
    }
  }

  // No event — continue.
  s = attemptFire(s, rng);
  s = reapDead(s, rng);

  return {
    state: {
      ...s,
      day: s.day + 1,
      date: advanceDate(s.date)
    }
  };
}

// Apply the player's chosen choice, then finish the rest of the day (fire attempt, death reap, advance).
export function applyPendingChoice(
  state: GameState,
  event: GameEvent,
  choiceId: string
): GameState {
  const rng = makeRng(`${state.seed}:${state.day}`);
  let s = resolveEvent(state, event, choiceId, rng);
  // Mark cooldown to prevent the same-day re-roll
  s = { ...s, flags: { ...s.flags, _lastEventDay: s.day } };

  // Finish the day
  s = attemptFire(s, rng);
  s = reapDead(s, rng);

  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
