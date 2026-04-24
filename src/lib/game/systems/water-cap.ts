import type { GameState } from '../types';
import { getWagon, type WagonModelId } from '../content/wagons';

/** Extra gallons per water_skin item owned (strap-on leather bags). */
export const WATER_SKIN_GAL = 5;

/**
 * Pure function — total waterCap from wagon model + skins. Wagon model
 * sets the wooden-keg baseline (~10–30 gal depending on size); each
 * water_skin adds 5 gal on top.
 */
export function computeWaterCap(
  wagonModel: WagonModelId,
  inventory: Record<string, number>
): number {
  const skins = inventory.water_skin ?? 0;
  return getWagon(wagonModel).baseWaterCapGal + skins * WATER_SKIN_GAL;
}

/**
 * Reconcile resources.waterCap with the player's current wagon +
 * water_skin count, preserving resources.water (clamped to new cap).
 * Call after any mutation that can change either (trade, outfit, wagon
 * swap).
 */
export function recomputeWaterCap(state: GameState): GameState {
  const nextCap = computeWaterCap(state.wagon.model, state.inventory);
  if (nextCap === state.resources.waterCap) return state;
  return {
    ...state,
    resources: {
      ...state.resources,
      waterCap: nextCap,
      water: Math.min(state.resources.water, nextCap)
    }
  };
}
