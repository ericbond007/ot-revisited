import type { GameState } from '../types';

const GERM_THEORY_YEAR = 1854;

export function canBoilWater(state: GameState): boolean {
  if (state.flags.hasBoilingKnowledge) return true;
  if (state.date.year >= GERM_THEORY_YEAR) return true;
  const hasLiveDoctor = state.party.some((m) => !m.dead && m.profession === 'doctor');
  return hasLiveDoctor;
}

export function waterborneDiseaseModifier(state: GameState): number {
  const hasCoffee = (state.inventory.coffee ?? 0) > 0;
  const hasTea = (state.inventory.tea ?? 0) > 0;
  if (hasCoffee || hasTea) return 0.6;
  return 1.0;
}
