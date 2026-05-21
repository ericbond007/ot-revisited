// #303b — pickHuntTarget extracted from src/lib/dev/bot/runner.ts so
// the same decision drives future independent NPC hunting (e.g. the
// Joe Meek named profile #287) and any future encountered-train wagon
// AI. Pure terrain → (target, ammo) decision.

import type { GameState } from '../types';
import type { HuntTarget, AmmoBand } from '../actions/hunt';

/** Pick a hunt target based on terrain. Big game on plains/prairie
 *  (only if ammo is plentiful — big game burns more), small in forest,
 *  the small/light fallback for everywhere else and the no-ammo case. */
export function pickHuntTarget(state: GameState): { target: HuntTarget; ammo: AmmoBand } {
  const inv = state.inventory;
  const plenty = (inv.gunpowder ?? 0) > 30
    && ((inv.lead_balls ?? 0) > 30 || (inv.lead_pig ?? 0) >= 1)
    && (inv.percussion_caps ?? 0) > 30;
  const terrain = state.location.terrain;
  if (terrain === 'prairie' && plenty) return { target: 'big', ammo: 'moderate' };
  if (terrain === 'forest') return { target: 'medium', ammo: 'moderate' };
  return { target: 'small', ammo: 'light' };
}
