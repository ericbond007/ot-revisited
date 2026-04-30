import type { GameState, Pace, Terrain } from '../types';
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
