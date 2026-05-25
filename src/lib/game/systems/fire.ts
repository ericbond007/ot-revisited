import type { GameState, Terrain, Weather } from '../types';
import type { Rng } from '../rng';
import { exposureMult } from './warmth';
import { nightTempF } from './temperature';

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

/** Pounds consumed per night of fire — split by night temperature
 *  (#1017). Period reality (Bryant 1846, Marcy 1859 Prairie Traveler,
 *  Royce 1849):
 *    - Warm-night cookfire only: small evening fire of chips or
 *      twigs for coffee + supper. Bryant: "the evening fire was
 *      small, of chips, for the coffee pot." ~2 lb wood-equivalent.
 *    - Cold-night sustained fire: kept stacked through the night for
 *      warmth. Reed Donner Sierra: "kept the fire stacked through
 *      the night, the cold being so deep no man slept without a
 *      foot to it." ~5 lb wood-equivalent (current rate).
 *  Pre-#1017 the engine burned 5 lb every night unconditionally —
 *  the Donner-Sierra rate applied to a July prairie cookfire. Result:
 *  bots couldn't stockpile fuel for the Snake/Blue Mountains push,
 *  universally died of Exposure in the late trail (see #963 audit). */
export const COLD_NIGHT_BURN = 5;
export const WARM_NIGHT_BURN = 2;

/** Legacy export — was used as a single threshold before #1017 split
 *  fire burn by temperature. Some callers still gate on "at least
 *  enough wood for a fire" without caring which kind; that floor
 *  is the warm-night rate. */
export const FIRE_WOOD_PER_NIGHT = WARM_NIGHT_BURN;

/**
 * Terrain-specific mean pounds of firewood available per travel day.
 * Calibrated against 1840s-50s diaries (Bryant 1846, Frizzell 1852,
 * Royce 1849, Carpenter 1857, Porter 1860, Sarah Raymond 1865) — see
 * VK #1020 audit. Period reality favored the lower-middle of each
 * range; the "wagon-box full" or "apron at every halt" extremes belong
 * to the gather_firewood camp action (2× rate, focused gather day).
 *
 * Pre-#1020 the prairie + desert numbers were ~3× too low vs period.
 * Bots couldn't accumulate chip surplus on the prairie leg → entered
 * Snake/Blue Mountains corridor short → Exposure deaths.
 *
 *   Frizzell 1852: "the children collected chips by the apron-full
 *     while we marched" → 15-25 lb chips/day on the prairie
 *   Royce 1849: "filled the wagon-box every morning" (chips)
 *   Bryant 1846 sage country: "sage faggots enough at every stop"
 *   Carpenter 1857 Blues: "the boys filled the wagon-box with
 *     deadfall in an hour"
 */
export const FIREWOOD_GATHER_MEAN: Record<Terrain, number> = {
  forest:    18,  // 12 → 18 (Carpenter Blues, Marcy "20 minutes for night's wood")
  prairie:   15,  // 6 → 15 (chips abundant; Frizzell/Royce/Porter apron-fulls)
  mountains: 10,  // unchanged — already matches Hastings/Frizzell
  desert:    6,   // 2 → 6 (sage thin but always present; Bryant/Carpenter)
  river:     14   // 8 → 14 (cottonwood + driftwood at every crossing)
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

/** #1019 — Below this nightTempF the camp is "cold-camp grade":
 *  burn rate switches to COLD_NIGHT_BURN and applyColdPenalty fires.
 *  Calibrated to preserve the binary's *deadly* cases (mountain
 *  frost, winter, sustained sub-freezing) while narrowing its
 *  overclaim on summer storms (Bryant 1846 "shivered but bore it"). */
const COLD_NIGHT_TEMP_THRESHOLD_F = 40;

/** #1073 — Per-degree-below-threshold intensity, clamped at ×3.
 *  40°F borderline = ×0 (no penalty), 32°F freezing = ×1 (binary
 *  baseline), 16°F mountain = ×3 (cap). */
const COLD_INTENSITY_DEGREE_STEP = 8;
const COLD_INTENSITY_MAX = 3;

function coldIntensity(state: GameState): number {
  const t = nightTempF(state);
  if (t >= COLD_NIGHT_TEMP_THRESHOLD_F) return 0;
  const scaled = (COLD_NIGHT_TEMP_THRESHOLD_F - t) / COLD_INTENSITY_DEGREE_STEP;
  return Math.min(COLD_INTENSITY_MAX, scaled);
}

function applyColdPenalty(state: GameState): GameState {
  const intensity = coldIntensity(state); // #1019 + #1073
  const cold = intensity > 0;
  // Clothing takes the edge off a cold camp — a fully-kitted party loses
  // ~20% of the health hit, a bare-shirt one takes the full dose.
  const exp = exposureMult(state);
  // #1073 — scale base hit by continuous intensity, then by clothing exp mult.
  // 40°F borderline → intensity=0 → no penalty branch above
  // 32°F → ×1 (binary baseline)
  // 16°F mountain frost → ×3
  const baseHit = COLD_NIGHT_HEALTH_HIT * intensity;
  const hit = Math.max(1, Math.round(baseHit * exp));
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
  const baseMorale = COLD_NIGHT_MORALE_HIT * intensity;
  const moraleHit = hasTent
    ? Math.max(1, Math.round(baseMorale / 2))
    : Math.max(1, Math.round(baseMorale));
  return {
    ...state,
    morale: Math.max(0, state.morale - moraleHit),
    party
  };
}

export function attemptFire(state: GameState, _rng: Rng): GameState {
  const wood = state.resources.firewood ?? 0;
  // #1017 — fire burn rate depends on the night's coldness. Warm
  // prairie nights consume just the cookfire-equivalent (2 lb);
  // cold mountain / storm / frost nights consume the sustained-warmth
  // fire rate (5 lb). Pre-#1017 every night burned 5 lb unconditionally.
  const cold = nightTempF(state) < COLD_NIGHT_TEMP_THRESHOLD_F; // #1019
  const burn = cold ? COLD_NIGHT_BURN : WARM_NIGHT_BURN;

  // Not enough wood for tonight's fire → cold camp.
  if (wood < burn) {
    const next = applyColdPenalty(state);
    const line = cold
      ? 'No firewood tonight. The camp shivered through a cold dark.'
      : 'No firewood tonight. Camp is dark but not dangerous.';
    return {
      ...next,
      flags: { ...next.flags, hadFireLastNight: false },
      eventLog: [...next.eventLog, { day: state.day, text: line }]
    };
  }

  // Wood on hand → fire lights. Weather-driven failures (storm, wet
  // wood) are handled by dedicated events, not a nightly dice roll.
  return {
    ...state,
    flags: { ...state.flags, hadFireLastNight: true },
    resources: { ...state.resources, firewood: wood - burn }
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
