import type { GameState, Terrain } from '../types';
import type { Rng } from '../rng';

const TERRAIN_BASE_CHANCE: Record<Terrain, number> = {
  forest: 0.98,
  prairie: 0.90,
  mountains: 0.80,
  desert: 0.70,
  river: 0.90
};

const PER_MEMBER_BONUS = 0.01;

export function fireSuccessChance(state: GameState): number {
  const base = TERRAIN_BASE_CHANCE[state.location.terrain];
  const alive = state.party.filter((m) => !m.dead).length;
  const bonus = Math.min(0.05, alive * PER_MEMBER_BONUS);
  return Math.min(0.99, base + bonus);
}

export function attemptFire(state: GameState, rng: Rng): GameState {
  const success = rng.chance(fireSuccessChance(state));
  const flags = { ...state.flags, hadFireLastNight: success };
  if (success) return { ...state, flags };
  return {
    ...state,
    flags,
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: 'Could not get a fire going tonight. Camp is cold and hungry.' }
    ]
  };
}
