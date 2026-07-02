import type { GameState, Terrain, Weather } from '../types';
import { makeRng, type Rng } from '../rng';
import {
  canvasWeatherDrain,
  canvasRainCatchMult,
  rollCanvasSupplyDamage,
  applyCanvasSupplyDamage
} from './canvas';
import { inZoneSnowFloor } from './winter';

// Daily weather (#153) — Markov-ish picker driven by terrain × season,
// with a stickiness bias toward yesterday's pattern (weather doesn't
// flip-flop daily). Same tick also applies the day's side-effects:
// rain refills clean water a bit, storms soak poorly-covered supplies
// (frame damage moved to the weather_storm event choices, #928), frost
// nips morale, etc.
//
// Pipeline placement: tickWeather runs FIRST in each daily tick, so
// every downstream system (travel, fire, water-loss) reads today's
// weather instead of yesterday's.

type Season = 'spring' | 'summer' | 'fall' | 'winter';

function seasonFor(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

// Per-(terrain, season) base weights. Probability of picking each
// weather kind on a fresh day. Missing entries = 0 weight.
type WeatherWeights = Partial<Record<Weather, number>>;

const BASE_WEIGHTS: Record<Terrain, Record<Season, WeatherWeights>> = {
  prairie: {
    spring: { clear: 4, overcast: 3, rain: 3, storm: 2, fog: 1 },
    summer: { clear: 6, overcast: 2, rain: 1, storm: 2, heat: 3 },
    fall:   { clear: 4, overcast: 3, rain: 2, storm: 1, fog: 1, frost: 1 },
    winter: { clear: 3, overcast: 3, snow: 3, frost: 3, storm: 1 }
  },
  mountains: {
    spring: { clear: 3, overcast: 3, rain: 2, storm: 2, snow: 1, fog: 2 },
    summer: { clear: 5, overcast: 3, rain: 2, storm: 2, fog: 1 },
    fall:   { clear: 3, overcast: 3, rain: 1, snow: 2, frost: 2, fog: 1 },
    winter: { clear: 1, overcast: 2, snow: 6, frost: 3, storm: 2 }
  },
  forest: {
    spring: { clear: 3, overcast: 4, rain: 4, storm: 1, fog: 2 },
    summer: { clear: 4, overcast: 3, rain: 3, storm: 1, fog: 1 },
    fall:   { clear: 3, overcast: 4, rain: 3, frost: 1, fog: 2 },
    winter: { clear: 2, overcast: 3, rain: 2, snow: 3, frost: 2 }
  },
  desert: {
    spring: { clear: 7, overcast: 1, heat: 2, storm: 1 },
    summer: { clear: 6, heat: 5, storm: 1 },
    fall:   { clear: 7, overcast: 1, heat: 1, frost: 1 },
    winter: { clear: 5, overcast: 2, frost: 2, storm: 1 }
  },
  river: {
    // River is a transient terrain (only at ford crossings); pick
    // something neutral.
    spring: { clear: 4, overcast: 3, rain: 2, fog: 2 },
    summer: { clear: 5, overcast: 2, rain: 2, fog: 1 },
    fall:   { clear: 4, overcast: 3, rain: 2, fog: 2 },
    winter: { clear: 2, overcast: 3, snow: 2, frost: 3 }
  }
};

/** Stickiness — yesterday's weather gets a 2x multiplier today, so
 *  patterns persist across days instead of flipping randomly. */
const STICKINESS_MULT = 2.0;

export function pickWeather(state: GameState, rng: Rng): Weather {
  const season = seasonFor(state.date.month);
  const base = BASE_WEIGHTS[state.location.terrain][season];
  const yesterday = state.weather ?? 'clear';

  // #1304 — in-zone October+ snow floor. When the party is inside a winter
  // zone (Blues or Cascades) past the storm-floor start date, add extra weight
  // to 'snow' on top of the base Markov weights. This does NOT disturb
  // out-of-zone weights — the existing fall/winter table is unchanged when
  // snowFloor === 0.
  const snowFloor = inZoneSnowFloor(state);

  // Build today's weighted pool. Apply stickiness to yesterday's kind.
  const weights: WeatherWeights = {};
  let total = 0;
  for (const [kind, w] of Object.entries(base) as Array<[Weather, number]>) {
    let adjusted = kind === yesterday ? w * STICKINESS_MULT : w;
    if (kind === 'snow' && snowFloor > 0) {
      // Floor ensures a minimum snow weight; additive on top of any
      // existing base weight (mountains already have snow: 2 in fall).
      adjusted = Math.max(adjusted, (base.snow ?? 0) + snowFloor);
    }
    weights[kind] = adjusted;
    total += adjusted;
  }
  // Inject 'snow' with just the floor if it wasn't in the base table at all
  // (e.g. desert / prairie in fall don't have snow in BASE_WEIGHTS).
  if (snowFloor > 0 && weights.snow === undefined) {
    weights.snow = snowFloor;
    total += snowFloor;
  }
  if (total <= 0) return 'clear';

  let pick = rng.next() * total;
  for (const [kind, w] of Object.entries(weights) as Array<[Weather, number]>) {
    pick -= w!;
    if (pick <= 0) return kind;
  }
  return 'clear';
}

/** Travel speed multiplier — read by milesPerDay. */
export function weatherTravelMult(weather: Weather | undefined): number {
  switch (weather) {
    case 'storm':    return 0.5;
    case 'snow':     return 0.6;
    case 'rain':     return 0.85;
    case 'heat':     return 0.85;
    case 'fog':      return 0.85;
    case 'frost':    return 0.95;
    case 'overcast':
    case 'clear':
    default:         return 1.0;
  }
}

/** Multiplier on water consumption from damp-cool weather (overcast/
 *  rain → modest reduction). #1074 — the heat branch moved to the
 *  continuous `tempWaterMult` in consumption.ts which reads dayTempF
 *  directly. Don't double-count heat here. */
export function weatherWaterMult(weather: Weather | undefined): number {
  switch (weather) {
    case 'overcast':
    case 'rain':     return 0.9;
    default:         return 1.0;
  }
}

/** Apply the day's weather side-effects: roll new weather, then bake
 *  in rain refills, storm damage, frost morale, etc.
 *
 *  Weather uses its own seeded sub-stream rather than the shared daily
 *  rng, so adding/removing weather doesn't shift the event roll for
 *  the rest of the day. Pre-#153 saves stay deterministic on resume.
 *  The `_rng` param is kept on the signature for pipeline uniformity. */
export function tickWeather(state: GameState, _rng: Rng): GameState {
  const wRng = makeRng(`${state.seed}:${state.day}:weather`);
  const next = pickWeather(state, wRng);
  let s: GameState = { ...state, weather: next };

  // Canvas drain — every wet/sun day chips the cover. Storm hits harder
  // than rain, snow does mid, desert heat does a slow bleed via linseed
  // dry-out (already a thing in period accounts of the desert leg).
  const drain = canvasWeatherDrain(next);
  if (drain.max > 0) {
    const d = wRng.int(drain.min, drain.max);
    if (d > 0) {
      s = { ...s, wagon: { ...s.wagon, canvas: Math.max(0, s.wagon.canvas - d) } };
    }
  }

  switch (next) {
    case 'rain': {
      // Rain refill — funnels through the canvas into kegs/buckets.
      // Yield scales with canvas integrity (torn cover catches less).
      const baseGain = 3;
      const mult = canvasRainCatchMult(s.wagon.canvas);
      const room = Math.max(0, s.resources.waterCap - s.resources.water);
      const gained = Math.min(room, Math.floor(baseGain * mult));
      if (gained > 0) {
        s = {
          ...s,
          resources: { ...s.resources, water: s.resources.water + gained },
          eventLog: [...s.eventLog, { day: s.day, text: `Rain — gathered ${gained} gal in the wagon canvas.` }]
        };
      } else if (mult <= 0 && room > 0) {
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'A steady rain falls — the torn canvas sheds it through.' }] };
      } else {
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'A steady rain falls.' }] };
      }
      // Roll for supply damage if canvas is poor.
      const damage = rollCanvasSupplyDamage(s, next, wRng);
      const applied = applyCanvasSupplyDamage(s, damage);
      s = applied.state;
      if (applied.logLine) {
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: applied.logLine }] };
      }
      break;
    }
    case 'storm': {
      // #928 — the automatic frame/morale hit is GONE. tickWeather runs
      // only in the player drivers (engine-pausable + rest), and the
      // player's storm damage now lives exclusively on the weather_storm
      // event's choice surface: press on (wagon -2, morale -2, ~20%
      // wind-loss roll) vs shelter (morale -1, lose the day). Uniform
      // with the #306-phase-2 RNG philosophy — bad things shouldn't be
      // guaranteed; decisions drive outcome. Previously the tick damage
      // ALSO stacked on top of the event choice on event days.
      //
      // NPC wagons never ran this path — they take applyNpcStormDamage
      // in the npc-engine 5b tail, which is their press-on equivalent
      // and is unchanged.
      //
      // Kept here: the canvas-condition-gated supply-soak roll below —
      // that's a consequence of neglected canvas maintenance (player
      // agency already), not an unavoidable act of god.
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'A thunderstorm builds over the trail.' }] };
      const damage = rollCanvasSupplyDamage(s, next, wRng);
      const applied = applyCanvasSupplyDamage(s, damage);
      s = applied.state;
      if (applied.logLine) {
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: applied.logLine }] };
      }
      break;
    }
    case 'snow': {
      s = {
        ...s,
        morale: Math.max(0, s.morale - 1),
        eventLog: [...s.eventLog, { day: s.day, text: 'Snow falling. The trail slows.' }]
      };
      const damage = rollCanvasSupplyDamage(s, next, wRng);
      const applied = applyCanvasSupplyDamage(s, damage);
      s = applied.state;
      if (applied.logLine) {
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: applied.logLine }] };
      }
      break;
    }
    case 'heat': {
      s = {
        ...s,
        eventLog: [...s.eventLog, { day: s.day, text: 'A scorching day. Water goes faster.' }]
      };
      break;
    }
    case 'frost': {
      s = {
        ...s,
        morale: Math.max(0, s.morale - 1),
        eventLog: [...s.eventLog, { day: s.day, text: 'Hard frost on the canvas this morning.' }]
      };
      break;
    }
    case 'fog':
    case 'overcast':
    case 'clear':
    default:
      // No log line for a normal day — keep the log readable.
      break;
  }

  return s;
}
