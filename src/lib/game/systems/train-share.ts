// #910 — generous-driven food sharing at company camp.
//
// At a sabbath / maintenance lay-by, a generous NPC companion wagon
// (Donner archetype: distributed food until reserves ran out) hands
// food to the player wagon and lifts player morale. Once per company-
// decision block (dedup'd via the block's `sharedThisBlock` flag).
//
// Engine handles the OUTER gating: train present, block is a lay-by
// (not crisis or travel), block not already shared this round, NPC
// has the goods on hand. The persona's `shouldShareWithTrain` answers
// the INNER question: given I could share, do I want to and what?
//
// crisis_layby is excluded — period reality is that companies in a
// genuine crisis guard their stores rather than redistribute; matches
// the §13 NPC-heal carve-out's "crisis is different" framing.
//
// Spec / discussion: VK #910.

import type { GameState } from '../types';
import type { Rng } from '../rng';
import { getPersona } from '../ai/personas';

/** Player morale lift on receipt of a share. Spec-faithful: emigrants
 *  who shared felt better than the math suggests; recipients lifted
 *  visibly. v1 starts at +10. */
export const SHARE_MORALE_PLAYER = 10;

export function applyTrainShare(state: GameState, rng: Rng): GameState {
  const train = state.wagonTrain;
  if (!train) return state;
  const block = train.companyDecisionBlock;
  if (!block) return state;
  if (block.mode !== 'sabbath_layby' && block.mode !== 'maintenance_layby') return state;
  if (block.sharedThisBlock) return state;

  // First-matching generous-and-stocked wagon shares. Iterating in
  // companion order is deterministic given the train's stable order
  // (matches the rest of the seeded engine).
  for (const wagon of train.companions) {
    const persona = getPersona(wagon.personaId ?? 'balanced');
    // Minimal fauxState for the persona's check. `careLevel` reads
    // inventory (food items), resources.water, morale, and
    // hasLiveDoctor(party); the generous impl additionally checks
    // inventory.flour. Listing every field explicitly per the #921r
    // missing-field lesson so a future expansion of
    // shouldShareWithTrain can't silently miss data.
    const fauxState = {
      inventory: wagon.inventory,
      party: wagon.party,
      resources: {
        water: wagon.water,
        waterCap: wagon.waterCap,
        dirtyWater: wagon.dirtyWater,
        firewood: 0
      },
      morale: wagon.morale
    } as unknown as GameState;
    const order = persona.shouldShareWithTrain(fauxState, rng);
    if (!order) continue;
    const have = wagon.inventory[order.item] ?? 0;
    if (have < order.qty) continue;

    // Transfer: NPC loses qty, player gains qty; player morale +10;
    // mark the block so subsequent days in the same block no-op.
    const updatedCompanions = train.companions.map((w) =>
      w.id === wagon.id
        ? { ...w, inventory: { ...w.inventory, [order.item]: have - order.qty } }
        : w
    );
    return {
      ...state,
      wagonTrain: {
        ...train,
        companions: updatedCompanions,
        companyDecisionBlock: { ...block, sharedThisBlock: true }
      },
      inventory: {
        ...state.inventory,
        [order.item]: (state.inventory[order.item] ?? 0) + order.qty
      },
      morale: Math.min(100, state.morale + SHARE_MORALE_PLAYER),
      eventLog: [
        ...state.eventLog,
        {
          day: state.day,
          text: `${wagon.name} shared ${order.qty} lb ${order.item} at camp. Morale +${SHARE_MORALE_PLAYER}.`
        }
      ]
    };
  }
  return state;
}
