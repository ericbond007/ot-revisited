import type { GameState } from '../types';
import { getPrice } from '../content/prices';
import { ITEMS } from '../content/items';
import { getLandmark } from '../content/landmarks';
import { getWagon } from '../content/wagons';
import { hasLiveMerchant, hasLiveBanker } from '../professions/predicates';
import { computeWaterCap } from '../systems/water-cap';

// Structured reveal written to flags._tradeResult. Consumed by
// TradeReceiptModal; cleared by `?/ackTrade`. JSON-serializable.
export interface TradeResult {
  postName: string;
  // Per-line items bought (one row per distinct item id).
  bought: Array<{ id: string; qty: number; lineTotal: number }>;
  // Per-line items sold.
  sold: Array<{ id: string; qty: number; lineTotal: number }>;
  rawCost: number;
  rawRevenue: number;
  netCost: number;      // rawCost - rawRevenue (positive = you paid)
  cashBefore: number;
  cashAfter: number;
  weightBefore: number;
  weightAfter: number;
  professionBonus: {
    merchant: boolean;
    banker: boolean;
    buyMult: number;
    sellMult: number;
    estimatedSavings: number; // how much the discounts saved vs no-bonus
  };
}

function itemWeight(id: string, qty: number): number {
  return (ITEMS[id]?.weightLbPerUnit ?? 0) * qty;
}

function totalInventoryWeight(inventory: Record<string, number>): number {
  return Object.entries(inventory).reduce(
    (sum, [id, qty]) => sum + itemWeight(id, qty ?? 0),
    0
  );
}

// Resolve an item id to its display name. Falls back to the id if missing
// (shouldn't happen — every tradable item has a catalog entry).
function itemName(id: string): string {
  return ITEMS[id]?.name ?? id.replace(/_/g, ' ');
}

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
export function professionDiscount(state: GameState): { buyMult: number; sellMult: number } {
  let buyDiscount = 0;
  let sellBonus = 0;
  if (hasLiveMerchant(state)) { buyDiscount += 0.15; sellBonus += 0.20; }
  if (hasLiveBanker(state))   { buyDiscount += 0.10; sellBonus += 0.10; }
  return { buyMult: 1 - buyDiscount, sellMult: 1 + sellBonus };
}

export function trade(state: GameState, opts: TradeOptions): GameState {
  const buys = opts.buys ?? [];
  const sells = opts.sells ?? [];

  const { buyMult: profBuyMult, sellMult: profSellMult } = professionDiscount(state);

  // Per-post buyer gating (#204). The post may refuse certain item
  // categories — road ranches don't deal in fur-trade specialty (raw
  // hides, robes, beads). Surface a clear error so the UI can echo it.
  const here = state.location.atLandmarkId
    ? getLandmark(state.location.atLandmarkId)
    : null;
  const excludedCats = new Set(here?.excludeBuyCategories ?? []);

  // #276 follow-up — per-post tier multiplier. Bridger gouges at 1.5×,
  // Whitman charges 0.9×, mid-trail posts default to 1.0×. Applied
  // symmetrically: a 1.5× post charges 50% more on buys AND pays 50%
  // more on sells (the markup ratio stays constant; the absolute price
  // scale shifts). Stacks multiplicatively with the profession bonus.
  const postMult = here?.priceMultiplier ?? 1.0;
  const buyMult = profBuyMult * postMult;
  const sellMult = profSellMult * postMult;

  for (const { item, qty } of sells) {
    const have = state.inventory[item] ?? 0;
    if (qty > have) {
      throw new Error(`trade: attempted to sell ${qty} ${item} but only have ${have} (quantity)`);
    }
    const cat = ITEMS[item]?.category;
    if (cat && excludedCats.has(cat)) {
      throw new Error(`trade: ${here?.name ?? 'this post'} won't buy ${item} (${cat})`);
    }
  }

  // Chicken wagon-cap — you can't buy more birds than the coop fits.
  // Enforced per-trade; sells don't need a check (selling frees space).
  const chickenBuy = buys.find((b) => b.item === 'chicken')?.qty ?? 0;
  if (chickenBuy > 0) {
    const chickenSell = sells.find((s) => s.item === 'chicken')?.qty ?? 0;
    const cap = getWagon(state.wagon.model).chickenCap;
    const afterCount = (state.inventory.chicken ?? 0) - chickenSell + chickenBuy;
    if (afterCount > cap) {
      throw new Error(`trade: coop is full — only ${cap - (state.inventory.chicken ?? 0) + chickenSell} more chickens fit.`);
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
  if (buys.length > 0) parts.push(`bought ${buys.map((b) => `${b.qty} ${itemName(b.item)}`).join(', ')}`);
  if (sells.length > 0) parts.push(`sold ${sells.map((s) => `${s.qty} ${itemName(s.item)}`).join(', ')}`);
  const logText = `Trade: ${parts.join('; ')} (net $${netDisplay}).`;

  // Build the receipt reveal. Per-line totals use post-discount prices
  // so what the player sees on the receipt matches what changed hands.
  const boughtLines: TradeResult['bought'] = buys.map(({ item, qty }) => ({
    id: item,
    qty,
    lineTotal: getPrice(item).buy * qty * buyMult
  }));
  const soldLines: TradeResult['sold'] = sells.map(({ item, qty }) => ({
    id: item,
    qty,
    lineTotal: getPrice(item).sell * qty * sellMult
  }));

  // Savings estimate vs "no profession bonus" so the Merchant/Banker
  // value is legible on the receipt. The post-tier multiplier still
  // applies to the no-bonus baseline — the post charges the same scale
  // to either bonus tier; only the profession discount/bonus differs.
  const rawCostNoBonus = buys.reduce(
    (sum, { item, qty }) => sum + getPrice(item).buy * qty * postMult, 0
  );
  const rawRevenueNoBonus = sells.reduce(
    (sum, { item, qty }) => sum + getPrice(item).sell * qty * postMult, 0
  );
  const estimatedSavings =
    (rawCostNoBonus - rawCost) + (rawRevenue - rawRevenueNoBonus);

  const hereId = state.location.atLandmarkId;
  const postName = hereId ? getLandmark(hereId).name : 'Trading Post';

  const result: TradeResult = {
    postName,
    bought: boughtLines,
    sold: soldLines,
    rawCost,
    rawRevenue,
    netCost: rawCost - rawRevenue,
    cashBefore: state.cash,
    cashAfter: newCash,
    weightBefore: totalInventoryWeight(state.inventory),
    weightAfter: totalInventoryWeight(inventory),
    professionBonus: {
      merchant: hasLiveMerchant(state),
      banker: hasLiveBanker(state),
      buyMult,
      sellMult,
      estimatedSavings
    }
  };

  // Water-carrying cap scales with water_bag count. Recompute after
  // every trade in case the player bought or sold skins; keep current
  // water level, clamped to the new cap (rare — cap rarely shrinks
  // mid-game, but sells can do it).
  const newWaterCap = computeWaterCap(state.wagon.model, inventory);

  return {
    ...state,
    cash: newCash,
    inventory,
    resources: {
      ...state.resources,
      waterCap: newWaterCap,
      water: Math.min(state.resources.water, newWaterCap)
    },
    eventLog: [...state.eventLog, { day: state.day, text: logText }],
    flags: {
      ...state.flags,
      _tradeResult: result as unknown as Record<string, unknown>
    }
  };
}
