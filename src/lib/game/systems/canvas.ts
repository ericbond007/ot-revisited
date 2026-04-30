import type { GameState, Weather } from '../types';
import type { Rng } from '../rng';

// Canvas (#201) — the wagon cover, separate stat from frame condition.
// Drains from rain / storm / snow / desert sun. Restored by rawhide
// patches (cheap, +8) or a fresh canvas spare (full-cover swap, +30).
// Low canvas leaks rain into stored supplies and reduces the rain-
// catch refill emigrants relied on in storms.

// --- Damage from weather ---

/** Per-day canvas drain by weather kind. Canvas takes more from storms
 *  than from a steady rain (wind tears seams), and a slow bleed from
 *  desert heat as linseed oil cooks out of the fabric. */
export function canvasWeatherDrain(weather: Weather | undefined): { min: number; max: number } {
  switch (weather) {
    case 'rain':  return { min: 1, max: 2 };
    case 'storm': return { min: 3, max: 6 };
    case 'snow':  return { min: 1, max: 3 };
    case 'heat':  return { min: 1, max: 1 };
    default:      return { min: 0, max: 0 };
  }
}

// --- Rain-catchment scaling ---

/** Scale on rain-catch refill from canvas condition. Below 60 the cover
 *  pools poorly; below 40 it shunts most water through the tears; below
 *  20 it's effectively useless as a funnel. */
export function canvasRainCatchMult(canvas: number): number {
  if (canvas >= 60) return 1.0;
  if (canvas >= 40) return 0.5;
  if (canvas >= 20) return 0.25;
  return 0;
}

// --- Supply-damage rolls ---

// Dry goods that ruin in a leaky cover. Period diaries call out exactly
// these: gunpowder, percussion caps, flour/cornmeal, sugar, salt, coffee/
// tea, tobacco. Bedding/cloth would mildew slow — left out for now.
const DRY_GOOD_VICTIMS = [
  'flour',
  'cornmeal',
  'loaf_sugar',
  'salt',
  'saleratus',
  'coffee',
  'tea',
  'tobacco'
] as const;

export interface CanvasSupplyDamage {
  // What was lost — id → lbs/units removed. Empty if no roll fired.
  losses: Record<string, number>;
  // True if this hit also took a chunk of gunpowder + caps.
  hitPowder: boolean;
}

/** Roll for supply damage when low canvas meets wet weather. Returns
 *  the deltas so the caller can apply them and craft a single log line.
 *
 *  Thresholds:
 *    canvas < 60 + rain  → 15% chance of light loss (one dry good, 2-5 lb)
 *    canvas < 40 + storm → 40% chance of loss + 30% gunpowder/caps roll
 *    canvas < 20 + storm/snow → 60% chance heavier loss (5-10 lb + powder/caps)
 */
export function rollCanvasSupplyDamage(
  state: GameState,
  weather: Weather | undefined,
  rng: Rng
): CanvasSupplyDamage {
  const canvas = state.wagon.canvas;
  const isWet = weather === 'rain' || weather === 'storm' || weather === 'snow';
  if (!isWet) return { losses: {}, hitPowder: false };

  let chance = 0;
  let lossMin = 0;
  let lossMax = 0;
  let powderChance = 0;
  if (canvas < 20 && (weather === 'storm' || weather === 'snow')) {
    chance = 0.6;
    lossMin = 5;
    lossMax = 10;
    powderChance = 1.0;
  } else if (canvas < 40 && weather === 'storm') {
    chance = 0.4;
    lossMin = 3;
    lossMax = 6;
    powderChance = 0.3;
  } else if (canvas < 60 && (weather === 'rain' || weather === 'storm')) {
    chance = 0.15;
    lossMin = 2;
    lossMax = 5;
    powderChance = 0;
  }

  if (chance <= 0 || !rng.chance(chance)) {
    return { losses: {}, hitPowder: false };
  }

  // Pick the heaviest available dry good as the casualty (player feels
  // the weight of the loss most when their main staple takes it).
  const losses: Record<string, number> = {};
  let pick: string | null = null;
  let pickAmount = 0;
  for (const id of DRY_GOOD_VICTIMS) {
    const have = state.inventory[id] ?? 0;
    if (have > pickAmount) {
      pick = id;
      pickAmount = have;
    }
  }
  if (pick) {
    const want = rng.int(lossMin, lossMax);
    losses[pick] = Math.min(pickAmount, want);
  }

  let hitPowder = false;
  if (powderChance > 0 && rng.chance(powderChance)) {
    const powder = state.inventory.gunpowder ?? 0;
    const caps = state.inventory.percussion_caps ?? 0;
    if (powder > 0) {
      losses.gunpowder = Math.min(powder, rng.int(2, 5));
      hitPowder = true;
    }
    if (caps > 0) {
      losses.percussion_caps = Math.min(caps, rng.int(5, 15));
      hitPowder = true;
    }
  }

  return { losses, hitPowder };
}

/** Apply a CanvasSupplyDamage roll to state, returning the new state +
 *  a log line describing the loss (or null if no loss). */
export function applyCanvasSupplyDamage(
  state: GameState,
  damage: CanvasSupplyDamage
): { state: GameState; logLine: string | null } {
  const ids = Object.keys(damage.losses);
  if (ids.length === 0) return { state, logLine: null };

  const inventory = { ...state.inventory };
  for (const id of ids) {
    inventory[id] = Math.max(0, (inventory[id] ?? 0) - damage.losses[id]);
  }

  const parts = ids.map((id) => `${damage.losses[id]} ${id.replace(/_/g, ' ')}`);
  const headline = damage.hitPowder
    ? 'Rain found the wagon. The powder was wet, the staples ruined.'
    : 'Rain leaked through a tear in the canvas — supplies spoiled.';
  const logLine = `${headline} Lost ${parts.join(', ')}.`;

  return {
    state: { ...state, inventory },
    logLine
  };
}
