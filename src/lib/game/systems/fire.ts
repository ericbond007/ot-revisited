import type { GameState, Terrain } from '../types';
import type { Rng } from '../rng';
import { exposureMult } from './warmth';

// Nightly fire. Wood is the gate — historically, emigrants with dry
// fuel and a flint could light a fire; the real daily problem was
// finding the fuel in the first place. Wet-weather failures are
// handled by dedicated storm events (future #136).
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
  return {
    ...state,
    morale: Math.max(0, state.morale - COLD_NIGHT_MORALE_HIT),
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
export function gatherFirewoodOnTravel(state: GameState, _rng: Rng): GameState {
  const mean = FIREWOOD_GATHER_MEAN[state.location.terrain];
  if (mean <= 0) return state;
  // Deterministic jitter from state.seed + state.day so RNG is stable
  // across save/load and doesn't compete with the shared tick rng.
  const lo = Math.max(0, Math.round(mean * 0.6));
  const hi = Math.round(mean * 1.4);
  // Tiny inline xorshift — don't pull in makeRng to avoid cycle.
  let h = 2166136261;
  const key = `${state.seed}:firewood:${state.day}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  const gained = Math.round(lo + r * (hi - lo));
  if (gained <= 0) return state;
  return {
    ...state,
    resources: {
      ...state.resources,
      firewood: (state.resources.firewood ?? 0) + gained
    }
  };
}
