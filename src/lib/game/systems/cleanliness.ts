import type { GameState, PartyMember } from '../types';
import type { Rng } from '../rng';
import { hasLiveDoctor } from '../professions/predicates';

/**
 * Cleanliness mechanic (#230). Per-member 0-100. Drains every travel
 * day with sweat + dust + axle grease; restored by river bathing
 * (washday) at camp. Diary reality: emigrants fixated on washday at
 * the Sweetwater, the Snake, the lower Columbia — not vanity, but
 * lice + skin + morale.
 *
 * Effects:
 *   - average party cleanliness < 30: morale −1/day
 *   - average party cleanliness < 10: morale −2/day instead
 *   - very low individuals (< 10): per-day filth-disease roll for
 *     dysentery (period: poor camp sanitation drove the cholera /
 *     typhoid / dysentery deaths as much as bad water)
 *
 * Ford days, storm days, and rain days don't decay (you got wet).
 *
 * Ties into:
 *   - day-tick (decay + threshold morale + filth-disease roll)
 *   - wash_clothes camp action (+30, or +50 with soap — #269)
 *   - bath-house town service at Laramie / Dalles (+50 — #270)
 *   - first-Sweetwater arrival event (+50 one-time set-piece)
 */

/** Default cleanliness for a fresh member or a migrated save. */
export const CLEANLINESS_DEFAULT = 100;

/** Base daily decay at moderate pace, clear weather. */
export const CLEANLINESS_DECAY_BASE = 1.5;

/** Cleanliness threshold below which morale takes a penalty. */
export const CLEANLINESS_DIRTY_THRESHOLD = 30;

/** Cleanliness threshold below which morale drops harder + disease risk fires. */
export const CLEANLINESS_FILTHY_THRESHOLD = 10;

/** Per-adult chance of filth-onset dysentery when an individual is below
 *  the filthy threshold. Halved by a live Doctor (camp hygiene matters). */
export const FILTH_DYSENTERY_CHANCE = 0.02;
export const FILTH_DYSENTERY_CHANCE_DOCTOR = 0.01;

/** Get a member's cleanliness with the default applied (handles legacy saves). */
function readCleanliness(m: PartyMember): number {
  return typeof m.cleanliness === 'number' ? m.cleanliness : CLEANLINESS_DEFAULT;
}

/** Pace + weather multiplier on the base decay. */
function decayMult(state: GameState): number {
  let mult = 1;
  if (state.pace === 'grueling') mult *= 1.33;
  else if (state.pace === 'fast') mult *= 1.15;
  else if (state.pace === 'slow') mult *= 0.85;
  if (state.weather === 'heat') mult *= 1.5;
  return mult;
}

/** Returns true if today's weather/route effectively bathed the party. */
function gotWetToday(state: GameState): boolean {
  // Rain or storm day = passive wash; ford days handled by camp action.
  return state.weather === 'rain' || state.weather === 'storm';
}

/** Daily decay step. Applied per alive member; dead members keep
 *  whatever cleanliness they had at death (used in event-log color
 *  flavor only — no mechanical effect once dead). */
export function decayCleanliness(state: GameState): GameState {
  if (gotWetToday(state)) return state;
  const dec = CLEANLINESS_DECAY_BASE * decayMult(state);
  if (dec <= 0) return state;
  const party = state.party.map((m) => {
    if (m.dead) return m;
    const cur = readCleanliness(m);
    const next = Math.max(0, Math.round((cur - dec) * 10) / 10);
    return { ...m, cleanliness: next };
  });
  return { ...state, party };
}

/** Average cleanliness across alive party. Returns 100 when nobody alive. */
export function avgCleanliness(state: GameState): number {
  const alive = state.party.filter((m) => !m.dead);
  if (alive.length === 0) return 100;
  const sum = alive.reduce((s, m) => s + readCleanliness(m), 0);
  return sum / alive.length;
}

/** Threshold-driven morale + log line for very dirty parties. Runs
 *  once per day-tick. Returns unchanged state when above threshold. */
export function applyDirtyMorale(state: GameState): GameState {
  const avg = avgCleanliness(state);
  if (avg >= CLEANLINESS_DIRTY_THRESHOLD) return state;
  const drop = avg < CLEANLINESS_FILTHY_THRESHOLD ? 2 : 1;
  return {
    ...state,
    morale: Math.max(0, state.morale - drop),
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: avg < CLEANLINESS_FILTHY_THRESHOLD
          ? `The party is filthy — sweat, dust, and grease worn into the skin. Morale −${drop}.`
          : `Tempers fraying without a chance to wash. Morale −${drop}.`
      }
    ]
  };
}

/** Filth-disease roll. Each alive adult below the filthy threshold
 *  gets a chance to onset dysentery. Doctor halves it. At most one
 *  new infection per day, same pattern as applyDirtyWaterRisk. */
export function applyFilthDiseaseRisk(state: GameState, rng: Rng): GameState {
  const chance = hasLiveDoctor(state)
    ? FILTH_DYSENTERY_CHANCE_DOCTOR
    : FILTH_DYSENTERY_CHANCE;
  const adults = state.party.filter((m) => !m.dead && m.kind === 'adult');
  for (const a of adults) {
    if (readCleanliness(a) >= CLEANLINESS_FILTHY_THRESHOLD) continue;
    if (a.conditions.some((c) => c.id === 'dysentery')) continue;
    if (rng.chance(chance)) {
      return {
        ...state,
        party: state.party.map((m) =>
          m.id === a.id
            ? { ...m, conditions: [...m.conditions, { id: 'dysentery', daysSinceOnset: 0 }] }
            : m
        ),
        eventLog: [
          ...state.eventLog,
          { day: state.day, text: `${a.name} fell ill from filth — dysentery.` }
        ]
      };
    }
  }
  return state;
}

/** Wash-clothes restorer used by the camp action and the Sweetwater
 *  set-piece. Adds `boost` cleanliness to every alive member,
 *  capped at 100. Doesn't touch dead members. */
export function washAll(state: GameState, boost: number): GameState {
  const party = state.party.map((m) => {
    if (m.dead) return m;
    const cur = readCleanliness(m);
    return { ...m, cleanliness: Math.min(100, cur + boost) };
  });
  return { ...state, party };
}
