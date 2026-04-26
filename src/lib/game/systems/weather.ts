import type { GameState, Terrain, Weather } from '../types';
import { makeRng, type Rng } from '../rng';

// Daily weather (#153) — Markov-ish picker driven by terrain × season,
// with a stickiness bias toward yesterday's pattern (weather doesn't
// flip-flop daily). Same tick also applies the day's side-effects:
// rain refills clean water a bit, storms damage the wagon, frost
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

  // Build today's weighted pool. Apply stickiness to yesterday's kind.
  const weights: WeatherWeights = {};
  let total = 0;
  for (const [kind, w] of Object.entries(base) as Array<[Weather, number]>) {
    const adjusted = kind === yesterday ? w * STICKINESS_MULT : w;
    weights[kind] = adjusted;
    total += adjusted;
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

/** Multiplier on water consumption — heat doubles it, cool overcast
 *  trims slightly. Read by waterConsumedToday. */
export function weatherWaterMult(weather: Weather | undefined): number {
  switch (weather) {
    case 'heat':     return 2.0;
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

  switch (next) {
    case 'rain': {
      // Light rain → small refill of clean water (caught in canvas).
      const room = Math.max(0, s.resources.waterCap - s.resources.water);
      const gained = Math.min(room, 3);
      if (gained > 0) {
        s = {
          ...s,
          resources: { ...s.resources, water: s.resources.water + gained },
          eventLog: [...s.eventLog, { day: s.day, text: `Rain — gathered ${gained} gal in the wagon canvas.` }]
        };
      } else {
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'A steady rain falls.' }] };
      }
      break;
    }
    case 'storm': {
      // Storm: wagon takes 1-3 condition, morale -2.
      const dmg = wRng.int(1, 3);
      s = {
        ...s,
        wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - dmg) },
        morale: Math.max(0, s.morale - 2),
        eventLog: [...s.eventLog, { day: s.day, text: `Thunderstorm — wagon -${dmg}, morale -2.` }]
      };
      break;
    }
    case 'snow': {
      s = {
        ...s,
        morale: Math.max(0, s.morale - 1),
        eventLog: [...s.eventLog, { day: s.day, text: 'Snow falling. The trail slows.' }]
      };
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
