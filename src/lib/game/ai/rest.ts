// #303b — pickRestCampChain extracted from src/lib/dev/bot/runner.ts's
// restWithWaterChain. The DECISION (which camp-action chains to try
// and in what order, terrain + firewood + boil-capability aware) is
// the pure AI bit; the orchestration (try each chain in turn,
// fall back to plain rest if all throw) stays with the driver
// (runner.ts retains the wrapping try/catch). Reusable for the future
// NPC find_water consumer (#303f follow-on) and named-profile rest
// behavior (#287).

import type { GameState } from '../types';
import { canBoilWater } from '../systems/water-purity';

export type CampActionId = 'find_water' | 'boil_water' | 'gather_firewood' | 'dig_well' | 'mend_clothes';

/** Decide which camp-action chains to try on a rest day that also
 *  needs to refill the keg, ordered by preference. The caller tries
 *  each chain in turn (catching gate-off errors) and falls back to a
 *  plain `rest(state, 1)` if every chain throws.
 *
 *  Shape mirrors the prior inline restWithWaterChain logic:
 *  - desert + shovel → try dig_well first (Marcy 1859: a well will
 *    yield water on most parts of the Plains)
 *  - boil-capable + firewood < 5 → try gather_firewood + find_water + boil_water
 *  - boil-capable + firewood ≥ 1 → try find_water + boil_water
 *  - always (last resort) → find_water alone */
export function pickRestCampChain(state: GameState): readonly (readonly CampActionId[])[] {
  const tryCamps: (readonly CampActionId[])[] = [];
  const fw = state.resources.firewood ?? 0;
  if (state.location.terrain === 'desert' && (state.inventory.shovel ?? 0) > 0) {
    tryCamps.push(['dig_well']);
  }
  if (canBoilWater(state)) {
    if (fw < 5) {
      tryCamps.push(['gather_firewood', 'find_water', 'boil_water']);
    }
    if (fw >= 1) {
      tryCamps.push(['find_water', 'boil_water']);
    }
  }
  tryCamps.push(['find_water']);
  return tryCamps;
}

/** #1072/#1193 — mend piggyback for rest days. The #927 bundle system is
 *  opt-in (default personas carry zero weights), so without this the
 *  default cohort never mends and garments hit 0 by the Blues (probe).
 *  Mirrors the runner's morale piggyback shape: append mend_clothes when
 *  the kit is owned, garments are meaningfully worn, and the action isn't
 *  already in the chain. Callers enforce the hour budget. Shared by the
 *  player-bot driver and the NPC rest path (parity). */
export function clothingMendWanted(state: GameState): boolean {
  return (state.inventory.sewing_kit ?? 0) > 0
    && (state.resources.clothingCondition ?? 100) < 60;
}
