import type { GameState, WaterRation } from '$lib/game/types';

const TIERS: readonly WaterRation[] = ['normal', 'conserve', 'drycamp'];
export function isWaterRation(v: string): v is WaterRation {
  return (TIERS as readonly string[]).includes(v);
}
export function setWaterRationOnState(state: GameState, tier: WaterRation): GameState {
  return { ...state, waterRation: tier };
}
