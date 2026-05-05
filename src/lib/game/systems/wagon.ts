import type { GameState, NpcWagonState, Pace, Terrain, Weather } from '../types';
import type { Rng } from '../rng';

const PACE_DECAY: Record<Pace, number> = {
  slow: 0.3,
  moderate: 0.6,
  fast: 1.0,
  grueling: 1.8
};

const TERRAIN_MULTIPLIER: Record<Terrain, number> = {
  prairie: 1.0,
  forest: 1.1,
  desert: 1.2,
  mountains: 1.8,
  river: 1.0
};

// Tar bucket (#201): pine-tar axle dressing in a bucket — every emigrant
// diary mentions it swinging under the wagon. Greases the hubs and
// slows axle wear; keeping one stocked cuts frame decay by 25%.
const TAR_BUCKET_DECAY_MULT = 0.75;

// Axle-grease consumption cycle (#214). Period reality: hubs got
// re-smeared every 200 mi or so. A single bucket carried multiple
// applications — we let it cover GREASE_CYCLE_MI of travel before the
// next dose draws another bucket. ~500 mi/bucket means a 2195-mi
// trail consumes ~4-5 buckets across the run.
const GREASE_CYCLE_MI = 500;

export function tickWagon(state: GameState, _rng: Rng): GameState {
  const base = PACE_DECAY[state.pace];
  const terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const tarMult = (state.inventory.tar_bucket ?? 0) > 0 ? TAR_BUCKET_DECAY_MULT : 1;
  const decay = base * terrain * tarMult;
  // Round to one decimal so successive float subtractions don't drift
  // into 95.80000000000004-style noise across many ticks. The condition
  // is still effectively a 0-100 integer for display purposes — call
  // sites Math.round() it.
  const condition = Math.max(0, Math.round((state.wagon.condition - decay) * 10) / 10);
  return { ...state, wagon: { ...state.wagon, condition } };
}

/**
 * Burn axle grease against miles travelled (#214). Each
 * GREASE_CYCLE_MI of travel consumes one tar_bucket; once the
 * stockpile runs out the existing tickWagon math drops back to
 * baseline decay (i.e. the -25% bonus disappears). Counter
 * saturates at threshold while empty, so a freshly-bought bucket
 * applies immediately on the next travel tick.
 */
export function applyAxleGrease(state: GameState, miles: number): GameState {
  if (miles <= 0) return state;
  const prevCounter = (state.flags?._greaseSinceLastDose as number | undefined) ?? 0;
  const prevBuckets = state.inventory.tar_bucket ?? 0;
  let bucketsLeft = prevBuckets;
  let remaining = prevCounter + miles;
  while (remaining >= GREASE_CYCLE_MI && bucketsLeft > 0) {
    bucketsLeft -= 1;
    remaining -= GREASE_CYCLE_MI;
  }
  if (remaining > GREASE_CYCLE_MI) remaining = GREASE_CYCLE_MI;
  let next: GameState = {
    ...state,
    inventory: { ...state.inventory, tar_bucket: bucketsLeft },
    flags: { ...state.flags, _greaseSinceLastDose: remaining }
  };
  if (prevBuckets > 0 && bucketsLeft === 0) {
    next = {
      ...next,
      eventLog: [
        ...next.eventLog,
        { day: next.day, text: 'The tar bucket runs dry — hubs going unsmeared.' }
      ]
    };
  }
  return next;
}

// --- #300 NPC parity ---
// Companion wagons currently never decay — `tickWagon` is player-only.
// Period reality (Marcy 1859, every emigrant diary): every wagon broke.
// Mirror the player's pace × terrain × tar formula on each NPC, run on
// travel days only. Storm wagon-damage also mirrored via
// `applyNpcStormDamage` so weather hits the company evenly. The #280c
// wheel-break event already fires on top.

/** Per-tick condition decay for an NPC wagon. Travel days only — call
 *  with `traveled=true`. The same pace × terrain × tar-mult formula as
 *  the player's `tickWagon`. */
export function applyNpcWagonDecay(
  wagon: NpcWagonState,
  ctx: { traveled: boolean; pace: Pace; terrain: Terrain }
): NpcWagonState {
  if (!ctx.traveled) return wagon;
  const base = PACE_DECAY[ctx.pace];
  const terrain = TERRAIN_MULTIPLIER[ctx.terrain];
  const tarMult = (wagon.inventory.tar_bucket ?? 0) > 0 ? TAR_BUCKET_DECAY_MULT : 1;
  const decay = base * terrain * tarMult;
  const condition = Math.max(0, Math.round((wagon.wagon.condition - decay) * 10) / 10);
  return { ...wagon, wagon: { ...wagon.wagon, condition } };
}

/** NPC mirror of `applyAxleGrease`. Counter lives on `wagon.greaseMiles`
 *  (NPCs don't have a flags blob). When the counter rolls past
 *  GREASE_CYCLE_MI and the wagon has a bucket, one tar_bucket is
 *  consumed. Returns the updated wagon plus an optional player-log
 *  string when the last bucket runs dry — matches the player's
 *  end-of-bucket announcement. */
export function applyNpcAxleGrease(
  wagon: NpcWagonState,
  miles: number
): { wagon: NpcWagonState; playerLog?: string } {
  if (miles <= 0) return { wagon };
  const prevCounter = wagon.greaseMiles ?? 0;
  const prevBuckets = wagon.inventory.tar_bucket ?? 0;
  let bucketsLeft = prevBuckets;
  let remaining = prevCounter + miles;
  while (remaining >= GREASE_CYCLE_MI && bucketsLeft > 0) {
    bucketsLeft -= 1;
    remaining -= GREASE_CYCLE_MI;
  }
  if (remaining > GREASE_CYCLE_MI) remaining = GREASE_CYCLE_MI;
  const next: NpcWagonState = {
    ...wagon,
    inventory: { ...wagon.inventory, tar_bucket: bucketsLeft },
    greaseMiles: remaining
  };
  if (prevBuckets > 0 && bucketsLeft === 0) {
    return {
      wagon: next,
      playerLog: `The ${wagon.name} ran out of tar — their hubs go unsmeared.`
    };
  }
  return { wagon: next };
}

/** Storm-day wagon damage for NPCs. Mirrors the player's
 *  `weather.ts` storm branch (1-3 condition damage per storm day).
 *  Returns the updated wagon plus an optional player-log string. */
export function applyNpcStormDamage(
  wagon: NpcWagonState,
  weather: Weather,
  rng: Rng
): { wagon: NpcWagonState; playerLog?: string } {
  if (weather !== 'storm') return { wagon };
  const dmg = rng.int(1, 3);
  const condition = Math.max(0, wagon.wagon.condition - dmg);
  return {
    wagon: { ...wagon, wagon: { ...wagon.wagon, condition } },
    playerLog: `Thunderstorm hit the ${wagon.name} — wagon -${dmg}.`
  };
}
