import type { GameState } from '../types';
import type { Rng } from '../rng';
import { BLACKSMITH_TOWN_REPAIR_DISCOUNT } from '../professions/bonuses';
import { washAll } from './cleanliness';
import { hasBlacksmithSupport } from './wagon-train';
import { getLandmark as getLandmarkOrThrow } from '../content/landmarks';

// Town services available at the bigger trading posts: blacksmith
// repairs, an inn for proper rest, and gambling. Each is opt-in per
// post via Landmark.services — small outposts (Bridger, Boise) carry
// only a forge or none at all; hubs (Laramie, Hall, Dalles) carry the
// full menu.
//
// All three are pure functions that return a new GameState. The play
// route's server actions wrap them in form-handler shells.

export type TownServiceKind = 'blacksmith' | 'inn' | 'gambling' | 'brothel' | 'gossip' | 'guide' | 'bath_house' | 'ox_swap';

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
 *  to spend (passed as `dollars`); we restore points up to 100. With a
 *  live Blacksmith in the party, the per-point rate is halved (the
 *  smith does the work — the post charges for materials only). */
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
  // #176 — discount applies when a blacksmith is in the party OR in
  // the wagon train. Caravan members swapped skilled labor freely
  // (Hancock 1852: paid in beef, milk, lodging — never cash).
  const smithSupport = hasBlacksmithSupport(state);
  const ratePerPoint = smithSupport
    ? REPAIR_DOLLARS_PER_POINT * BLACKSMITH_TOWN_REPAIR_DISCOUNT
    : REPAIR_DOLLARS_PER_POINT;
  const desiredPoints = Math.floor(want / ratePerPoint);
  const points = Math.min(room, desiredPoints);
  const cost = Math.ceil(points * ratePerPoint);
  const flavor = smithSupport
    ? `The smith worked the forge with help from your party. +${points} condition for $${cost}.`
    : `The blacksmith patched the wagon. +${points} condition for $${cost}.`;
  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    wagon: { ...state.wagon, condition: state.wagon.condition + points },
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: flavor }
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
  // #922 — bumped 5 → 15/night. A paid bed + warm meal is meaningfully
  // better than free rest (+10/day). Inn now sits above rest in the
  // recovery menu; brothel above inn.
  const moraleGain = Math.min(100 - state.morale, n * 15);
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
// #922 — bumped 4 → 7/man. A typical 2-3 man brothel visit lifts
// morale by +14-21, hitting the "~+20" target in the morale-tuning
// audit. Brothel sits above inn (15/night) and rest (10/day) in the
// recovery menu — biggest single-stop morale lift, but pox risk.
export const BROTHEL_MORALE_PER_MAN = 7;
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

// --- Forge ox shoes ---
//
// Period-correct: fort smiths often re-shod oxen for emigrants and
// pre-made shoes were a standard line item. Cost matches the trade
// buy price ($1.50/pair) — the smith's bread-and-butter service. With
// a live Blacksmith in the party, the per-pair rate is halved (same
// logic as repairs — your smith does the work, the post charges
// materials only). Available at any post with `blacksmith` service.

export const FORGE_OX_SHOES_DOLLARS_PER_PAIR = 1.5;

export interface ForgeOxShoesResult {
  state: GameState;
  pairs: number;
  cost: number;
}

/** Forge `pairs` pairs of ox shoes at the post smithy. Adds them to
 *  the inventory and deducts cash. Throws on insufficient funds. */
export function forgeOxShoes(state: GameState, pairs: number): ForgeOxShoesResult {
  const n = Math.max(0, Math.floor(pairs));
  if (n <= 0) {
    return { state, pairs: 0, cost: 0 };
  }
  const smithSupport = hasBlacksmithSupport(state);
  const ratePerPair = smithSupport
    ? FORGE_OX_SHOES_DOLLARS_PER_PAIR * BLACKSMITH_TOWN_REPAIR_DISCOUNT
    : FORGE_OX_SHOES_DOLLARS_PER_PAIR;
  const cost = Math.ceil(n * ratePerPair);
  if (state.cash < cost) {
    throw new Error(`forgeOxShoes: not enough cash ($${state.cash} < $${cost})`);
  }
  const flavor = smithSupport
    ? `Forged ${n} pairs of ox shoes alongside the post smith. $${cost}.`
    : `The post smith hammered out ${n} pairs of ox shoes. $${cost}.`;
  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    inventory: { ...state.inventory, ox_shoes: (state.inventory.ox_shoes ?? 0) + n },
    eventLog: [...state.eventLog, { day: state.day, text: flavor }]
  };
  return { state: next, pairs: n, cost };
}

// #270 — Bath-house at major trading posts. Period reality: by the
// late 1840s Fort Laramie and a few river-port towns ran bath-houses
// — tin tub, hot water carted from the kitchen, charge ~$1 for a soak.
// The Dalles ran proper bath-houses by 1850 (steamboat-era). Big
// cleanliness reset versus the 3-hour wash_clothes camp action that
// only restores +30: a paid hot-water soak at a real bath-house gives
// +50 across the alive party in a single visit. Period diaries (Royce,
// Frizzell) describe these as the "first proper bath in three months."
export const BATH_HOUSE_DOLLARS_PER_PERSON = 1;
export const BATH_HOUSE_CLEANLINESS_BOOST = 50;
export const BATH_HOUSE_MORALE_BUMP = 4;

export interface BathHouseResult {
  state: GameState;
  cost: number;
  bathed: number;
}

export function useBathHouse(state: GameState): BathHouseResult {
  const alive = state.party.filter((m) => !m.dead);
  if (alive.length === 0) {
    return { state, cost: 0, bathed: 0 };
  }
  const cost = alive.length * BATH_HOUSE_DOLLARS_PER_PERSON;
  if (state.cash < cost) {
    throw new Error(`useBathHouse: not enough cash ($${state.cash} < $${cost})`);
  }
  let next = washAll(state, BATH_HOUSE_CLEANLINESS_BOOST);
  next = {
    ...next,
    cash: next.cash - cost,
    morale: Math.min(100, next.morale + BATH_HOUSE_MORALE_BUMP),
    eventLog: [
      ...next.eventLog,
      { day: state.day, text: `Soaked in the bath-house — hot water, soap, a real towel. ${alive.length} bathed for $${cost}. Morale +${BATH_HOUSE_MORALE_BUMP}, cleanliness +${BATH_HOUSE_CLEANLINESS_BOOST}.` }
    ]
  };
  return { state: next, cost, bathed: alive.length };
}

// --- #278 Trading-post oxen swap (barter-first) ---
// Period reality (Parkman 1846, Palmer 1845 guidebook, Helen Carpenter
// 1857): Laramie / Bridger / Hall ran a swap economy — 2 trail-worn
// oxen for 1 fresh + a small cash boot was the standard 1840s deal.
// Cash-only purchases were available but steep: $40-60/yoke jumping-off,
// $80-100/yoke at Laramie in normal years. The 1849-50 Gold Rush spike
// (Mattes, Unruh) doubled cash prices to $75-100/head at Laramie and
// $200/yoke at Bridger — emigrants frequently abandoned wagons rather
// than pay.
//
// Why this is gameplay-load-bearing: emigrant teams thinned via
// fatigue, lameness, and ox death over the journey, and swap economy
// at the forts was the standard recovery tool. Without it, wagons that
// fall under their `minTeam` are permanently stranded — which is
// exactly where bots stall today (post-Bridger, eastern Oregon).
//
// Mechanic: barter mode requires 2 surrendered oxen per fresh, plus
// the boot. Cash-only mode pays full price per head with no surrenders.
// Available only at posts with the `ox_swap` service flag (Laramie,
// Bridger, Hall — NOT Boise; period: HBC kept light on oxen, more
// horses + salmon).

/** Cash boot per fresh ox in barter mode (default 1840s rate). */
export const OX_SWAP_BARTER_BOOT_USD = 40;
/** Cash-only price per fresh ox (no surrenders). Period: $80-100/yoke
 *  at Laramie = $40-50/head + the trader's margin. */
export const OX_SWAP_CASH_ONLY_USD = 75;
/** Gold Rush years where cash multipliers double. */
export const OX_SWAP_GOLD_RUSH_YEARS = new Set([1849, 1850]);
/** Gold Rush price multiplier — period diaries record 2× the normal
 *  rate. Mattes / Unruh document $200/yoke at Bridger in 1849-50. */
export const OX_SWAP_GOLD_RUSH_MULT = 2;

export interface SwapOxenOpts {
  /** Cash-only purchase: no oxen surrendered, pay the full per-head
   *  price. Skips the surrenderIds requirement entirely. */
  cashOnly?: boolean;
}

export interface SwapOxenResult {
  state: GameState;
  surrenderedCount: number;
  freshCount: number;
  cost: number;
  /** True if 1849-50 Gold Rush pricing applied. */
  goldRush: boolean;
}

/** Compute the cost in dollars to acquire `freshCount` fresh oxen
 *  given the current year + mode. Doesn't validate availability or
 *  party state — used by both the engine and UI to preview. */
export function swapOxenCost(
  state: GameState,
  freshCount: number,
  opts: SwapOxenOpts = {}
): { cost: number; goldRush: boolean } {
  const goldRush = OX_SWAP_GOLD_RUSH_YEARS.has(state.date.year);
  const mult = goldRush ? OX_SWAP_GOLD_RUSH_MULT : 1;
  const perHead = opts.cashOnly
    ? OX_SWAP_CASH_ONLY_USD * mult
    : OX_SWAP_BARTER_BOOT_USD * mult;
  return { cost: Math.max(0, freshCount) * perHead, goldRush };
}

/** Acquire `freshCount` fresh oxen at the current post. Barter mode
 *  (default) requires `surrenderIds.length === 2 * freshCount` —
 *  surrendered oxen are removed from the team. Cash-only mode skips
 *  the surrenders and pays the higher per-head rate.
 *
 *  Throws on: not at a post / post lacks `ox_swap` service / wrong
 *  surrender count for barter / surrender ids not found / cash short. */
export function swapOxen(
  state: GameState,
  surrenderIds: string[],
  freshCount: number,
  opts: SwapOxenOpts = {}
): SwapOxenResult {
  const fresh = Math.max(0, Math.floor(freshCount));
  if (fresh <= 0) {
    return { state, surrenderedCount: 0, freshCount: 0, cost: 0, goldRush: false };
  }

  const landmarkId = state.location.atLandmarkId;
  if (!landmarkId) {
    throw new Error('swapOxen: not at a landmark');
  }
  // Lazy import to avoid a circular dep on landmarks → systems.
  const here = getLandmarkOrThrow(landmarkId);
  if (!(here.services ?? []).includes('ox_swap')) {
    throw new Error(`swapOxen: ${landmarkId} does not run an ox swap`);
  }

  const cashOnly = !!opts.cashOnly;
  if (!cashOnly && surrenderIds.length !== 2 * fresh) {
    throw new Error(
      `swapOxen: barter requires 2 surrendered per fresh (need ${2 * fresh}, got ${surrenderIds.length})`
    );
  }

  // Validate every surrender id exists in the current team. Doesn't
  // require them to be alive — period: dead oxen still had hide value
  // in trade. But typical caller surrenders the lowest-health alive
  // oxen via the persona helper.
  const idSet = new Set(surrenderIds);
  if (!cashOnly) {
    for (const id of surrenderIds) {
      if (!state.oxen.some((o) => o.id === id)) {
        throw new Error(`swapOxen: ox ${id} not in team`);
      }
    }
  }

  const { cost, goldRush } = swapOxenCost(state, fresh, opts);
  if (state.cash < cost) {
    throw new Error(`swapOxen: not enough cash ($${state.cash} < $${cost})`);
  }

  const remainingTeam = cashOnly
    ? state.oxen
    : state.oxen.filter((o) => !idSet.has(o.id));

  // Generate fresh ox ids that don't collide with the remaining team.
  const usedIds = new Set(remainingTeam.map((o) => o.id));
  const freshOxen = [];
  let nextN = 0;
  for (let i = 0; i < fresh; i++) {
    let id = `ox-fresh-${state.day}-${nextN}`;
    while (usedIds.has(id)) {
      nextN += 1;
      id = `ox-fresh-${state.day}-${nextN}`;
    }
    usedIds.add(id);
    freshOxen.push({ id, health: 100, fatigue: 0, shod: true });
    nextN += 1;
  }

  const flavor = cashOnly
    ? `Bought ${fresh} fresh ox${fresh === 1 ? '' : 'en'} at ${here.name} for $${cost}${goldRush ? ' (Gold Rush prices)' : ''}.`
    : `Swapped ${surrenderIds.length} trail-worn ox${surrenderIds.length === 1 ? '' : 'en'} for ${fresh} fresh at ${here.name} — $${cost} boot${goldRush ? ' (Gold Rush prices)' : ''}.`;

  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    oxen: [...remainingTeam, ...freshOxen],
    eventLog: [...state.eventLog, { day: state.day, text: flavor }]
  };

  return {
    state: next,
    surrenderedCount: cashOnly ? 0 : surrenderIds.length,
    freshCount: fresh,
    cost,
    goldRush
  };
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
