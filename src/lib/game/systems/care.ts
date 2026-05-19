import type { GameState } from '../types';
import { foodItemIds } from '../content/items';
import { hasLiveDoctor } from '../professions/predicates';

// #1046 A+D — the shared passive care gate. Spec §6/§7: a tended
// company is fed, watered (no dry keg), and not in despair; a live
// doctor is the accelerated tier and overrides the tended test (the
// doctor rides with the company even on a thin day). Consumed by both
// progressConditions (D, natural-course scaling) and applyDailyRecovery
// (A, in-motion convalesce). Lives in its own module so conditions.ts
// and travel-recovery.ts don't import-cycle through each other.
export type CareLevel = 'doctor' | 'tended' | 'untended';

export const CARE_MIN_MORALE = 25;

export function careLevel(state: GameState): CareLevel {
  if (hasLiveDoctor(state)) return 'doctor';
  const hasFood = foodItemIds().some((id) => (state.inventory[id] ?? 0) > 0);
  const hasWater = state.resources.water > 0;
  const moraleOk = state.morale >= CARE_MIN_MORALE;
  return hasFood && hasWater && moraleOk ? 'tended' : 'untended';
}
