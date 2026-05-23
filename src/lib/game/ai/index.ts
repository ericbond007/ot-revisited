// #302 Game AI — public surface.
//
// Single import point for any consumer (player bot driver, NPC engine
// tick, future encountered-train wagon AI). Add new decision modules
// here as they're extracted.

export type { FordMethod, Persona, PersonaId, ShareOrder } from './types';
export {
  PERSONAS,
  cautiousPersona,
  balancedPersona,
  aggressivePersona,
  chaosPersona,
  // #287b — named-profile variants
  sundayResterPersona,
  pacePusherPersona,
  hoarderPersona,
  generousPersona,
  faithfulPersona,
  drinkerPersona,
  choiceMatching,
  getPersona,
  makeBotRng
} from './personas';
export type { BuyOrder, ShoppingInput } from './shopping';
export { gapAwareWaterBagTarget, desertWaterFloor, effectiveGapMiles, nextSupplyDistance } from './foresight';
export {
  pickWarmthRestock,
  pickEquipmentRestock,
  pickFoodRestock,
  pickHunterRestock,
  pickRepairRestock,
  pickMedicineRestock,
  composeShoppingList,
  missingSurvivalGear
} from './shopping';
// #303b — three lift-and-shifts from src/lib/dev/bot/runner.ts so the
// same decisions can drive NPC and named-profile AI.
export { pickHuntTarget } from './hunt';
export { defaultCompanions, COMPANION_PRIORITY } from './party';
export { pickRestCampChain, type CampActionId } from './rest';
