import type { GameState } from './types';
import { makeRng } from './rng';
import type { Rng } from './rng';
import { upgradeState } from './upgrade';
import { applyDailyConsumption, applyDirtyWaterRisk } from './systems/consumption';
import { applyStarvation } from './systems/starvation';
import { tickWeather } from './systems/weather';
import { progressConditions } from './systems/conditions';
import { tickOxen } from './systems/oxen';
import { tickWagon } from './systems/wagon';
import { adjustMorale } from './systems/morale';
import { applyTravel, milesToLandmark } from './systems/travel';
import { rollEvent, resolveEvent } from './systems/events';
import { attemptFire } from './systems/fire';
import { reapDead } from './systems/death';
import { applySpoilage, applyHeatSpoilage } from './systems/spoilage';
import { applyDehydration } from './systems/dehydration';
import { applyEggLay } from './systems/eggs';
import { applyDairy, applyButterChurn } from './systems/dairy';
import { isSunday } from './utils/calendar';
import { hasLivePreacher } from './professions/predicates';
import { applyDietVariety, applyHotDrinks } from './systems/diet';
import { applyHolidays } from './systems/holidays';
import { decayCleanliness, applyDirtyMorale, applyFilthDiseaseRisk } from './systems/cleanliness';
import { advanceTrain } from './systems/wagon-train';
import { maybeElectCaptain } from './systems/wagon-train-elections';
import type { GameEvent } from './content/events';
import { getLandmarkArrivalEvent } from './content/landmark-arrival-events';
import { pickApproachEvent, approachFiredFlag } from './content/landmark-approach-events';
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

/** Surface a fired event for the player by resolving its dynamic
 *  context (bodyKey text-pool variant, then the optional `prepare`
 *  hook for #282/#289-style events). Used at all 3 firing sites
 *  (rollEvent / arrival / approach) so the wire is one-place-only and
 *  testable in isolation. */
export function prepareEventForSurfacing(
  state: GameState,
  event: GameEvent,
  rng: Rng
): GameState {
  let s = state;
  if (event.bodyKey) {
    const resolvedBody = pickText(event.bodyKey, rng, event.body);
    s = { ...s, flags: { ...s.flags, _pendingEventBody: resolvedBody } };
  }
  if (event.prepare) {
    if (import.meta.env?.DEV && event.bodyKey) {
      // The prepare hook is allowed to overwrite _pendingEventBody, but
      // doing so silently masks the bodyKey resolution. Surface this in
      // dev so it's visible when an event accidentally sets both.
      // eslint-disable-next-line no-console
      console.warn(
        `[event ${event.id}] sets both bodyKey and prepare — prepare's body wins.`
      );
    }
    s = event.prepare(s, rng);
  }
  return s;
}

export function tickDayPausable(state: GameState): PausableTickResult {
  const normalized = upgradeState(state);
  const rng = makeRng(`${normalized.seed}:${normalized.day}`);

  let s = tickWeather(normalized, rng);

  // Sabbath-breaking morale debit (#224). Religious diaries from
  // Catherine Sager to the Reed family record the guilt of traveling
  // Sundays; pragmatic captains argued miles over scripture. -2 morale
  // per Sunday Travel (-3 with a live Preacher — they amplify both
  // directions of the choice). The +morale bump for choosing the lay-
  // by lives in actions/sunday-lay-by.ts; this debit fires only when
  // the player presses Travel on a Sabbath.
  if (isSunday(s.date)) {
    const debit = hasLivePreacher(s) ? 3 : 2;
    s = {
      ...s,
      morale: Math.max(0, s.morale - debit),
      eventLog: [...s.eventLog, { day: s.day, text: `Traveled on the Sabbath. Morale −${debit}.` }]
    };
  }

  s = progressConditions(s, rng);
  // Eggs lay at dawn so today's yield is available for today's meal.
  s = applyEggLay(s);
  // Milk cow yield (#139) — runs alongside egg lay so today's milk is
  // available for today's meal. Sets a weather-sensitive 1-4 day spoil
  // clock; spoilage tick below clears any pile that's gone past.
  s = applyDairy(s);
  // Wagon-pail butter churn (#222) — runs BEFORE consumption so the
  // morning's surplus lands in butter, not breakfast. Period reality:
  // women set the crock at dawn before anyone drank coffee. Inside
  // tickDayPausable = travel day (camp/visit go through different
  // routes), so the wagon will be jostling either way.
  s = applyButterChurn(s);
  // Spoilage runs BEFORE consumption so the party can't eat rotten meat
  // on its spoil-day. Any remaining fresh game_meat / eggs / berries
  // are zeroed out first; heat-day rancidity nibbles bacon + salt_pork.
  s = applySpoilage(s);
  s = applyHeatSpoilage(s);
  // Cleanliness (#230) — decay first, then threshold morale + filth
  // disease before consumption so today's dirt nicks today's mood.
  s = decayCleanliness(s);
  s = applyDirtyMorale(s);
  s = applyFilthDiseaseRisk(s, rng);
  s = applyDailyConsumption(s);
  s = applyDietVariety(s);
  s = applyHotDrinks(s);
  s = applyDirtyWaterRisk(s, rng);
  s = applyStarvation(s);
  s = tickOxen(s, rng);
  s = tickWagon(s, rng);
  s = adjustMorale(s, rng);
  s = applyHolidays(s);

  // Snapshot which landmark we'd already passed before today's travel —
  // used below to detect a fresh arrival.
  const prevLandmarkBefore = s.location.previousLandmarkId;
  s = applyTravel(s, rng);

  const arrivedAtLandmark = s.location.atLandmarkId !== null && s.location.atLandmarkId !== undefined;

  // #285 — Wagon-train captain elections. Fires when the player
  // arrives at a major post (Kearny / Laramie / Bridger / Hall /
  // Boise) while in a train AND avg train morale is below the
  // threshold (period-faithful: re-elections were petitioned by an
  // unhappy company, not scheduled). Per-(landmark, day) flag inside
  // maybeElectCaptain prevents re-rolls; just adds a log line + may
  // swap leaderId. No modal yet — the player learns the result via
  // the day's log.
  if (arrivedAtLandmark && s.wagonTrain) {
    s = maybeElectCaptain(s, rng).state;
  }

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
    const arrival = getLandmarkArrivalEvent(prevLandmarkAfter, s);
    if (arrival) {
      s = prepareEventForSurfacing(s, arrival, rng);
      return { state: s, pendingEvent: arrival };
    }
  }

  // Approach events (#233) — first-sight vignettes that fire BEFORE
  // reaching a landmark, when its silhouette first becomes visible from
  // miles out. One-shot per landmark via _approachFired_<id>. Skipped on
  // arrival days so the at-landmark stage takes precedence.
  if (!arrivedAtLandmark && s.flags._lastEventDay !== s.day) {
    const approach = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    if (approach) {
      s = {
        ...s,
        flags: { ...s.flags, [approachFiredFlag(approach.landmarkId)]: true }
      };
      s = prepareEventForSurfacing(s, approach.event, rng);
      return { state: s, pendingEvent: approach.event };
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
      s = prepareEventForSurfacing(s, pending, rng);
      return { state: s, pendingEvent: pending };
    }
  }

  // No event — continue.
  s = attemptFire(s, rng);
  s = applyDehydration(s);
  s = reapDead(s, rng);

  // #280b/#288 — advance NPC wagons one day alongside the player.
  // Travel day, so `traveled=true`. Each companion runs its own
  // attrition. May return a pendingEvent if a companion just hit
  // a starvation crisis — surface it before advancing the day.
  const trainResult = advanceTrain(s, true);
  s = trainResult.state;
  if (trainResult.pendingEvent) {
    return { state: s, pendingEvent: trainResult.pendingEvent };
  }

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

  // #280b/#288 — advance NPC wagons. Event-day still counts as travel
  // for them. NPC starvation crisis events that arise here are NOT
  // re-surfaced (would chain modals on the same tick); they queue
  // for tomorrow's tickDayPausable.
  const trainResult = advanceTrain(s, true);
  s = trainResult.state;

  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
