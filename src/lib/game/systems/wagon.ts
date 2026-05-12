import type { GameState, NpcWagonState, Pace, Terrain, Weather } from '../types';
import type { Rng } from '../rng';
import { hasLiveCarpenter } from '../professions/predicates';

/** #317b — carpenter daily-maintenance bonus. Tightens spokes,
 *  re-pegs joints, refits iron tires. Period reality: a carpenter
 *  in the party kept the wagon alive a noticeable fraction longer
 *  on the same trail. -15% decay rate per travel tick. Stacks with
 *  the existing tar-bucket reduction (the carpenter does the
 *  greasing properly too). */
const CARPENTER_DECAY_MULT = 0.85;

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
  const carpenterMult = hasLiveCarpenter(state) ? CARPENTER_DECAY_MULT : 1;
  const decay = base * terrain * tarMult * carpenterMult;
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

// #939h — `applyNpcWagonDecay` + `applyNpcAxleGrease` parallel impls
// removed. NPC wagon decay + axle grease cycle now flow through
// engine `tickWagon` + `applyAxleGrease` via wagon-synth. The
// greaseMiles ↔ `flags._greaseSinceLastDose` bridge from #941 carries
// the cycle counter. NPCs gain the carpenter decay mult the parallel
// impl didn't have. `applyNpcStormDamage` retained — player has no
// engine-level storm-damage tick (player storm hits via events.ts).

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
