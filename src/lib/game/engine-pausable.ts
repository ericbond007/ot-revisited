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
import { applySpoilage } from './systems/spoilage';
import { applyDehydration } from './systems/dehydration';
import { applyEggLay } from './systems/eggs';
import type { GameEvent } from './content/events';
import { getLandmarkArrivalEvent } from './content/landmark-arrival-events';
import { pickText } from './content/text-pools';

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
  // Eggs lay at dawn so today's yield is available for today's meal.
  s = applyEggLay(s);
  // Spoilage runs BEFORE consumption so the party can't eat rotten meat
  // on its spoil-day. Any remaining fresh game_meat is zeroed out first.
  s = applySpoilage(s);
  s = applyDailyConsumption(s);
  s = tickOxen(s, rng);
  s = tickWagon(s, rng);
  s = adjustMorale(s, rng);

  // Snapshot which landmark we'd already passed before today's travel —
  // used below to detect a fresh arrival.
  const prevLandmarkBefore = s.location.previousLandmarkId;
  s = applyTravel(s, rng);

  const arrivedAtLandmark = s.location.atLandmarkId !== null && s.location.atLandmarkId !== undefined;

  // Landmark arrival events fire when we cross a scenic landmark (one
  // that doesn't already pause for a Visit/Ford/End screen). Detected by
  // a change in previousLandmarkId during this tick. Skipped at
  // stop-worthy landmarks so the post/river/end UI is the moment.
  const prevLandmarkAfter = s.location.previousLandmarkId;
  if (
    !arrivedAtLandmark
    && prevLandmarkAfter
    && prevLandmarkAfter !== prevLandmarkBefore
    && s.flags._lastEventDay !== s.day
  ) {
    const arrival = getLandmarkArrivalEvent(prevLandmarkAfter);
    if (arrival) {
      if (arrival.bodyKey) {
        const resolvedBody = pickText(arrival.bodyKey, rng, arrival.body);
        s = { ...s, flags: { ...s.flags, _pendingEventBody: resolvedBody } };
      }
      return { state: s, pendingEvent: arrival };
    }
  }

  // Travel events fire only on the road, never on arrival at a landmark
  // (trading post, river, end). If the day's travel just parked us at a
  // stop-worthy landmark, the player gets the landmark stage first; any
  // on-road event from today would arrive on top of the trading-post UI.
  // Check event WITHOUT resolving. If cooldown allows, roll; if one fires, pause here.
  if (!arrivedAtLandmark && s.flags._lastEventDay !== s.day) {
    const pending = rollEvent(s, rng);
    if (pending) {
      // Resolve body variant at fire time so it stays consistent across renders.
      // Falls back to the inline body string when no pool is registered yet.
      if (pending.bodyKey) {
        const resolvedBody = pickText(pending.bodyKey, rng, pending.body);
        s = { ...s, flags: { ...s.flags, _pendingEventBody: resolvedBody } };
      }
      return { state: s, pendingEvent: pending };
    }
  }

  // No event — continue.
  s = attemptFire(s, rng);
  s = applyDehydration(s);
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
