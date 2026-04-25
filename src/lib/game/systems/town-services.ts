import type { GameState } from '../types';
import type { Rng } from '../rng';

// Town services available at the bigger trading posts: blacksmith
// repairs, an inn for proper rest, and gambling. Each is opt-in per
// post via Landmark.services — small outposts (Bridger, Boise) carry
// only a forge or none at all; hubs (Laramie, Hall, Dalles) carry the
// full menu.
//
// All three are pure functions that return a new GameState. The play
// route's server actions wrap them in form-handler shells.

export type TownServiceKind = 'blacksmith' | 'inn' | 'gambling' | 'brothel' | 'gossip' | 'guide';

// --- Blacksmith ---

/** $/point of wagon condition. Cheap enough that a worn wagon can be
 *  rehabbed for the cost of a few wagon parts, but not so cheap that
 *  it eclipses carrying spares. */
export const REPAIR_DOLLARS_PER_POINT = 0.5;

export interface RepairResult {
  state: GameState;
  pointsRestored: number;
  cost: number;
}

/** Pay the smith to restore wagon condition. The player picks how much
 *  to spend (passed as `dollars`); we restore points up to 100. */
export function repairWagon(state: GameState, dollars: number): RepairResult {
  const want = Math.max(0, Math.floor(dollars));
  if (want <= 0) {
    return { state, pointsRestored: 0, cost: 0 };
  }
  if (state.cash < want) {
    throw new Error(`repairWagon: not enough cash ($${state.cash} < $${want})`);
  }
  const room = Math.max(0, 100 - state.wagon.condition);
  if (room <= 0) {
    return { state, pointsRestored: 0, cost: 0 };
  }
  const desiredPoints = Math.floor(want / REPAIR_DOLLARS_PER_POINT);
  const points = Math.min(room, desiredPoints);
  const cost = Math.ceil(points * REPAIR_DOLLARS_PER_POINT);
  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    wagon: { ...state.wagon, condition: state.wagon.condition + points },
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `The blacksmith patched the wagon. +${points} condition for $${cost}.` }
    ]
  };
  return { state: next, pointsRestored: points, cost };
}

// --- Inn ---

/** $/night/person at standard posts. End-of-trail luxury posts charge
 *  more — read from the per-post override. */
export const INN_DOLLARS_PER_PERSON_PER_NIGHT = 1;

export interface InnResult {
  state: GameState;
  nights: number;
  cost: number;
}

/** Stay the night at the inn — cash for HP + morale. Doesn't consume
 *  food/water (meals are served). Advances `day` by `nights`. */
export function stayAtInn(
  state: GameState,
  nights: number,
  dollarsPerPersonPerNight: number = INN_DOLLARS_PER_PERSON_PER_NIGHT
): InnResult {
  const n = Math.max(1, Math.floor(nights));
  const alive = state.party.filter((m) => !m.dead).length;
  if (alive === 0) return { state, nights: 0, cost: 0 };
  const cost = n * alive * dollarsPerPersonPerNight;
  if (state.cash < cost) {
    throw new Error(`stayAtInn: not enough cash ($${state.cash} < $${cost})`);
  }
  const moraleGain = Math.min(100 - state.morale, n * 5);
  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    morale: state.morale + moraleGain,
    party: state.party.map((m) =>
      m.dead ? m : { ...m, health: Math.min(100, m.health + n * 5) }
    ),
    day: state.day + n,
    date: advanceNDays(state.date, n),
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: `Stayed ${n} ${n === 1 ? 'night' : 'nights'} at the inn for $${cost}. Hot meals, a real bed.`
      }
    ]
  };
  return { state: next, nights: n, cost };
}

// --- Gambling ---

export const GAMBLE_WIN_CHANCE = 0.45;

export interface GambleResult {
  state: GameState;
  won: boolean;
  delta: number;
}

/** Wager `stake` dollars on a coin flip (45% to win). On a win, the
 *  player gets stake back AND an equal amount; on a loss, stake is
 *  forfeit. Negative-EV by design — gambling drains money on average. */
export function gamble(state: GameState, rng: Rng, stake: number): GambleResult {
  const s = Math.max(1, Math.floor(stake));
  if (state.cash < s) {
    throw new Error(`gamble: not enough cash ($${state.cash} < $${s})`);
  }
  const won = rng.chance(GAMBLE_WIN_CHANCE);
  const delta = won ? s : -s;
  const next: GameState = {
    ...state,
    cash: state.cash + delta,
    morale: Math.max(0, Math.min(100, state.morale + (won ? 2 : -2))),
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: won
          ? `Won $${s} at cards. Spirits high — morale +2.`
          : `Lost $${s} at cards. The party glares — morale -2.`
      }
    ]
  };
  return { state: next, won, delta };
}

// --- Brothel ---
//
// Period-flavored "cribs" service available at the bigger road ranches
// + Hog Ranches that sprung up alongside Army posts (Laramie, Hall,
// Dalles, Hollenberg). $/adult-male in the party, morale up, no other
// effects in this first cut. Disease risk can layer on later.

export const BROTHEL_DOLLARS_PER_MAN = 5;
export const BROTHEL_MORALE_PER_MAN = 4;
export const BROTHEL_POX_CHANCE_PER_MAN = 0.08;

export interface BrothelResult {
  state: GameState;
  men: number;
  cost: number;
  moraleGain: number;
  infected: string[];
}

/** Adult men in the party visit the cribs. Cost scales by the number
 *  of men (party-wide gesture, even if not literally everyone goes).
 *  No-op for parties without an adult male. Each man has an 8% chance
 *  of contracting the pox (era name for syphilis) — daily morale +
 *  HP drain that lingers for the rest of the journey. */
export function visitBrothel(state: GameState, rng: Rng): BrothelResult {
  const men = state.party.filter(
    (m) => !m.dead && m.kind === 'adult' && m.sex === 'male'
  );
  if (men.length === 0) {
    return { state, men: 0, cost: 0, moraleGain: 0, infected: [] };
  }
  const cost = men.length * BROTHEL_DOLLARS_PER_MAN;
  if (state.cash < cost) {
    throw new Error(`visitBrothel: not enough cash ($${state.cash} < $${cost})`);
  }

  // Roll per-man for the pox. Skip men who already have it.
  const infected: string[] = [];
  const party = state.party.map((m) => {
    const isCandidate = men.some((c) => c.id === m.id);
    if (!isCandidate) return m;
    const alreadyHas = m.conditions.some((c) => c.id === 'pox');
    if (alreadyHas) return m;
    if (rng.chance(BROTHEL_POX_CHANCE_PER_MAN)) {
      infected.push(m.name);
      return {
        ...m,
        conditions: [...m.conditions, { id: 'pox' as const, daysSinceOnset: 0 }]
      };
    }
    return m;
  });

  const moraleGain = Math.min(100 - state.morale, men.length * BROTHEL_MORALE_PER_MAN);
  const baseLine = `Spent $${cost} at the cribs out back. The men returned in good cheer — morale +${moraleGain}.`;
  const log = [
    ...state.eventLog,
    { day: state.day, text: baseLine }
  ];
  if (infected.length > 0) {
    log.push({
      day: state.day,
      text: `Days later, ${infected.join(' and ')} ${infected.length === 1 ? 'shows' : 'show'} the first signs of the pox.`
    });
  }

  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    morale: state.morale + moraleGain,
    party,
    eventLog: log
  };
  return { state: next, men: men.length, cost, moraleGain, infected };
}

// --- Hire a guide ---
//
// Mountain men, ex-fur-trappers, and Native scouts hung around the
// hubs offering paid guidance for short stretches of trail. The
// player pays cash, and for a window of days the wagon moves faster
// (read by travel.ts via the _guideUntilDay flag). Negative side-
// effect: the guide eats from your stores while present (handled
// implicitly — they're an extra mouth for the day-tick).

export const GUIDE_DOLLARS_PER_DAY = 4;
export const GUIDE_SPEED_MULT = 1.15;

export interface GuideResult {
  state: GameState;
  days: number;
  cost: number;
}

/** Pay `dollars` to hire a guide for floor(dollars / GUIDE_DOLLARS_PER_DAY)
 *  days. Sets _guideUntilDay so travel.ts can read the bonus. */
export function hireGuide(state: GameState, dollars: number): GuideResult {
  const want = Math.max(0, Math.floor(dollars));
  if (want < GUIDE_DOLLARS_PER_DAY) {
    return { state, days: 0, cost: 0 };
  }
  if (state.cash < want) {
    throw new Error(`hireGuide: not enough cash ($${state.cash} < $${want})`);
  }
  const days = Math.floor(want / GUIDE_DOLLARS_PER_DAY);
  const cost = days * GUIDE_DOLLARS_PER_DAY;
  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    flags: { ...state.flags, _guideUntilDay: state.day + days },
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `Hired a local guide for ${days} days. The wagon moves quicker with him along.` }
    ]
  };
  return { state: next, days, cost };
}

// --- Helpers ---

function advanceNDays(d: { year: number; month: number; day: number }, n: number) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let { year, month, day } = d;
  for (let i = 0; i < n; i++) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const cap = month === 2 && leap ? 29 : daysInMonth[month - 1];
    day += 1;
    if (day > cap) { day = 1; month += 1; }
    if (month > 12) { month = 1; year += 1; }
  }
  return { year, month, day };
}
