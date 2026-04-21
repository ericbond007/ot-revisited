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

export function tickWagon(state: GameState, _rng: Rng): GameState {
  const base = PACE_DECAY[state.pace];
  const terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const decay = base * terrain;
  const condition = Math.max(0, state.wagon.condition - decay);
  return { ...state, wagon: { ...state.wagon, condition } };
}
