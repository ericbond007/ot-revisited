// #302 Game AI — public surface.
//
// Single import point for any consumer (player bot driver, NPC engine
// tick, future encountered-train wagon AI). Add new decision modules
// here as they're extracted.

export type { FordMethod, Persona, PersonaId } from './types';
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
