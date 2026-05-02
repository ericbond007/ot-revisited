import type { GameState, Terrain, Weather } from '../types';
import type { Rng } from '../rng';
import { exposureMult } from './warmth';

// Nightly fire. Wood is the gate — historically, emigrants with dry
// fuel and a flint could light a fire; the real daily problem was
// finding the fuel in the first place. Wet-weather days reduce the
// passive gather (#143) — wood already stowed under the canvas stays
// dry, so the bite comes from a thin gather pile during multi-day
// storms eventually emptying the stockpile.
//
// Sequence each night:
//   1. If firewood < FIRE_WOOD_PER_NIGHT → cold camp, no fire.
//   2. Otherwise consume the wood and set hadFireLastNight.

/** Pounds consumed per night of fire. */
export const FIRE_WOOD_PER_NIGHT = 5;

/**
 * Terrain-specific mean pounds of firewood available per travel day.
 * Abstracts the historical reality: cottonwood groves along rivers,
 * buffalo chips + sagebrush on the plains, deadfall in mountains,
 * scarce desert sage.
 */
export const FIREWOOD_GATHER_MEAN: Record<Terrain, number> = {
  forest: 12,
  prairie: 6,  // chips + sage + cottonwood along the river leg
  mountains: 10,
  desert: 2,   // sparse greasewood and sage
  river: 8     // driftwood
};

/**
 * Wet-weather multiplier on the day's gather (#143). Wood already in
 * the wagon stays dry under canvas — only today's pickup is hit.
 *  - rain: half normal (some sticks under cover)
 *  - snow: 60% (dry powder, harder to spot deadfall)
 *  - storm: 20% (sheltering more than gathering)
 *  - everything else: clear-day baseline
 */
export function weatherWoodFactor(weather: Weather | undefined): number {
  switch (weather) {
    case 'storm': return 0.2;
    case 'rain':  return 0.5;
    case 'snow':  return 0.6;
    default:      return 1.0;
  }
}

/** Yields below this fraction of the clear-weather mean trigger a
 *  log-line note so the player sees the wet-weather mechanic working
 *  before the stockpile runs dry. */
const WET_GATHER_LOG_THRESHOLD = 0.3;

/** Cold-night health hit per adult when no fire in cool terrain. */
const COLD_NIGHT_HEALTH_HIT = 3;
const COLD_NIGHT_MORALE_HIT = 2;

function isColdNight(state: GameState): boolean {
  // Mountains always bite. Winter months (Nov–Feb) bite everywhere.
  if (state.location.terrain === 'mountains') return true;
  const m = state.date.month;
  return m === 11 || m === 12 || m === 1 || m === 2;
}

function applyColdPenalty(state: GameState): GameState {
  const cold = isColdNight(state);
  // Clothing takes the edge off a cold camp — a fully-kitted party loses
  // ~20% of the health hit, a bare-shirt one takes the full dose.
  const exp = exposureMult(state);
  const hit = Math.max(1, Math.round(COLD_NIGHT_HEALTH_HIT * exp));
  const party = cold
    ? state.party.map((m) =>
        m.dead ? m : { ...m, health: Math.max(0, m.health - hit) }
      )
    : state.party;
  // #218 — canvas A-frame tent halves the morale hit when present.
  // Wind and rain off the bedrolls; the camp wakes less ragged. Health
  // hit unchanged — clothing is what mitigates the cold itself; the tent
  // is the morale layer.
  const hasTent = (state.inventory.tent ?? 0) > 0;
  const moraleHit = hasTent
    ? Math.max(1, Math.round(COLD_NIGHT_MORALE_HIT / 2))
    : COLD_NIGHT_MORALE_HIT;
  return {
    ...state,
    morale: Math.max(0, state.morale - moraleHit),
    party
  };
}

export function attemptFire(state: GameState, _rng: Rng): GameState {
  const wood = state.resources.firewood ?? 0;

  // No wood → cold camp, no fire.
  if (wood < FIRE_WOOD_PER_NIGHT) {
    const cold = applyColdPenalty(state);
    const line = isColdNight(state)
      ? 'No firewood tonight. The camp shivered through a cold dark.'
      : 'No firewood tonight. Camp is dark but not dangerous.';
    return {
      ...cold,
      flags: { ...cold.flags, hadFireLastNight: false },
      eventLog: [...cold.eventLog, { day: state.day, text: line }]
    };
  }

  // Wood on hand → fire lights. Weather-driven failures (storm, wet
  // wood) are handled by dedicated events, not a nightly dice roll.
  return {
    ...state,
    flags: { ...state.flags, hadFireLastNight: true },
    resources: { ...state.resources, firewood: wood - FIRE_WOOD_PER_NIGHT }
  };
}

/**
 * Passive firewood gain from a travel day. Uses its own seeded rng
 * (keyed on seed + day) so inserting this into the travel pipeline
 * doesn't shift the shared tick rng downstream — that would change
 * wagon-break and event rolls and drift calibrated tests.
 *
 * Note: takes `_rng` for call-site symmetry with other systems, but
 * ignores it in favor of a deterministic day-seeded draw.
 */
/**
 * Fuel flavor by terrain (#219). Wood was scarce-to-absent on the
 * plains and the high desert; emigrants burned what they had:
 *   prairie → buffalo chips ("dried bison dung," gathered in canvas
 *             aprons by women + kids — a near-universal surprise to
 *             eastern travelers).
 *   desert  → sage brush (greasewood, sage roots; smoky and bitter
 *             but it lit).
 *   forest / mountains / river → firewood as normal.
 *
 * The mechanic stays unchanged — it's all `state.resources.firewood`
 * — but the label and log line read terrain-correct.
 */
export function fuelFlavorFor(terrain: string): { material: string; source: string } {
  switch (terrain) {
    case 'prairie': return { material: 'buffalo chips', source: 'plains' };
    case 'desert':  return { material: 'sage brush', source: 'sagebrush flats' };
    case 'forest':  return { material: 'firewood', source: 'forest' };
    case 'mountains': return { material: 'firewood', source: 'mountains' };
    case 'river':   return { material: 'firewood', source: 'river bank' };
    default:        return { material: 'firewood', source: terrain };
  }
}

export function gatherFirewoodOnTravel(state: GameState, _rng: Rng): GameState {
  const baseMean = FIREWOOD_GATHER_MEAN[state.location.terrain];
  if (baseMean <= 0) return state;
  // Wet weather (#143) cuts the gather mean — wood already in the
  // wagon stays dry under canvas, so the bite comes from a thin pickup
  // pile while the storm holds.
  const factor = weatherWoodFactor(state.weather);
  const mean = baseMean * factor;
  // Deterministic jitter from state.seed + state.day so RNG is stable
  // across save/load and doesn't compete with the shared tick rng.
  const lo = Math.max(0, mean * 0.6);
  const hi = mean * 1.4;
  // Tiny inline xorshift — don't pull in makeRng to avoid cycle.
  let h = 2166136261;
  const key = `${state.seed}:firewood:${state.day}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  const gained = Math.round(lo + r * (hi - lo));
  let next: GameState = state;
  if (gained > 0) {
    next = {
      ...next,
      resources: {
        ...next.resources,
        firewood: (next.resources.firewood ?? 0) + gained
      }
    };
  }
  // Surface a one-line note on noticeably-wet days so the player can
  // see the mechanic before the stockpile bottoms out at night. Compare
  // against the clear-day mean (baseMean), not the wet-discounted one,
  // so the threshold tracks "how much you'd normally get here".
  if (gained < baseMean * WET_GATHER_LOG_THRESHOLD && factor < 1.0) {
    const fuel = fuelFlavorFor(state.location.terrain);
    const woodNote = gained <= 0
      ? `Wet weather kept any ${fuel.material} out of reach today.`
      : `Wet weather kept the ${fuel.material} pile thin today — only ${gained} lb gathered.`;
    next = {
      ...next,
      eventLog: [...next.eventLog, { day: state.day, text: woodNote }]
    };
  }
  return next;
}
