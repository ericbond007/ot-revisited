import type { GameState } from '../types';
import { getPrice } from '../content/prices';
import { hasLiveMerchant, hasLiveBanker } from '../professions/predicates';

export interface TradeEntry {
  item: string;
  qty: number;
}

export interface TradeOptions {
  buys?: TradeEntry[];
  sells?: TradeEntry[];
}

// Additive stacking: prevents runaway combined discounts. Merchant+Banker
// together = -25% buy / +30% sell (vs. the old multiplicative -23.5% / +32%).
function professionDiscount(state: GameState): { buyMult: number; sellMult: number } {
  let buyDiscount = 0;
  let sellBonus = 0;
  if (hasLiveMerchant(state)) { buyDiscount += 0.15; sellBonus += 0.20; }
  if (hasLiveBanker(state))   { buyDiscount += 0.10; sellBonus += 0.10; }
  return { buyMult: 1 - buyDiscount, sellMult: 1 + sellBonus };
}

export function trade(state: GameState, opts: TradeOptions): GameState {
  const buys = opts.buys ?? [];
  const sells = opts.sells ?? [];

  const { buyMult, sellMult } = professionDiscount(state);

  for (const { item, qty } of sells) {
    const have = state.inventory[item] ?? 0;
    if (qty > have) {
      throw new Error(`trade: attempted to sell ${qty} ${item} but only have ${have} (quantity)`);
    }
  }

  let rawCost = 0;
  for (const { item, qty } of buys) {
    rawCost += getPrice(item).buy * qty * buyMult;
  }
  // Use ceiling for the cash-check so players can't spend money they don't have
  if (Math.ceil(rawCost) > state.cash) {
    const displayCost = Math.round(rawCost);
    throw new Error(`trade: not enough cash ($${state.cash} < $${displayCost})`);
  }

  let rawRevenue = 0;
  for (const { item, qty } of sells) {
    rawRevenue += getPrice(item).sell * qty * sellMult;
  }

  const inventory: Record<string, number> = { ...state.inventory };
  for (const { item, qty } of buys) {
    inventory[item] = (inventory[item] ?? 0) + qty;
  }
  for (const { item, qty } of sells) {
    inventory[item] = (inventory[item] ?? 0) - qty;
  }

  const newCash = Math.round(state.cash - rawCost + rawRevenue);
  const netDisplay = Math.round(rawRevenue - rawCost);

  const parts: string[] = [];
  if (buys.length > 0) parts.push(`bought ${buys.map((b) => `${b.qty} ${b.item}`).join(', ')}`);
  if (sells.length > 0) parts.push(`sold ${sells.map((s) => `${s.qty} ${s.item}`).join(', ')}`);
  const logText = `Trade: ${parts.join('; ')} (net $${netDisplay}).`;

  return {
    ...state,
    cash: newCash,
    inventory,
    eventLog: [...state.eventLog, { day: state.day, text: logText }]
  };
}
