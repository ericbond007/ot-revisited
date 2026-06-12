import type { GameState } from '../types';
import { getPrice } from '../content/prices';
import { ITEMS } from '../content/items';
import { getLandmark, postBuysForCash, type Landmark } from '../content/landmarks';
import { professionDiscount } from '../actions/trade';
import {
  BARTER_RATE_FLOOR,
  BARTER_POST_PREFERENCE_BONUS,
  BARTER_POST_REJECT_PENALTY
} from './barter';
import { postRemainingQty, recordPostPurchases } from './post-stock';
import { getWagon } from '../content/wagons';
import { computeWaterCap } from './water-cap';
import { getClothingCondition, getFootwearCondition } from './clothing-wear';

export interface TradeBasket {
  mode: 'cash' | 'barter';
  get: Record<string, number>;
  give: Record<string, number>;
  cashOffer?: number;
}

export interface SettleResult {
  state: GameState;
  /** Positive = player paid cash (net buy); negative = post paid the
   *  player (net sell). Equals `cashBefore - cashAfter`. */
  netCash: number;
  getValue: number;
  giveValue: number;
  /** Barter mode only: giveTotal / getValue (advisory fairness ratio). */
  rate?: number;
}

function entries(rec: Record<string, number>): Array<[string, number]> {
  return Object.entries(rec).filter(([, q]) => q > 0);
}

function prefRejectMult(post: Landmark, id: string): number {
  let m = 1.0;
  if ((post.barterPreferred ?? []).includes(id)) m *= 1 + BARTER_POST_PREFERENCE_BONUS;
  if ((post.barterRefused ?? []).includes(id)) m *= 1 - BARTER_POST_REJECT_PENALTY;
  return m;
}

export function settleTrade(state: GameState, basket: TradeBasket): SettleResult {
  const here = state.location.atLandmarkId ? getLandmark(state.location.atLandmarkId) : null;
  if (!here || here.kind !== 'trading_post') {
    throw new Error('settleTrade: not at a trading post');
  }
  const postMult = here.priceMultiplier ?? 1.0;
  const year = state.date.year;
  const { buyMult: pBuy, sellMult: pSell } = professionDiscount(state);

  const getE = entries(basket.get);
  const giveE = entries(basket.give);

  for (const [id, qty] of giveE) {
    const have = state.inventory[id] ?? 0;
    if (qty > have) throw new Error(`settleTrade: insufficient ${id} (have ${have}, need ${qty})`);
  }
  for (const [id, qty] of getE) {
    const remaining = postRemainingQty(state, here, id);
    if (qty > remaining) throw new Error(`settleTrade: out of stock — ${id} (${remaining} left)`);
  }

  // Chicken coop cap: can't end up with more birds than the wagon fits.
  const chickenBuy = basket.get.chicken ?? 0;
  if (chickenBuy > 0) {
    const chickenSell = basket.give.chicken ?? 0;
    const cap = getWagon(state.wagon.model).chickenCap;
    const afterCount = (state.inventory.chicken ?? 0) - chickenSell + chickenBuy;
    if (afterCount > cap) {
      throw new Error(`settleTrade: coop is full — only ${cap - (state.inventory.chicken ?? 0) + chickenSell} more chickens fit.`);
    }
  }

  // Profession (merchant/banker) discount applies to the BUY side in CASH
  // mode only. Barter values goods at plain post price — parity with
  // applyBarter()/quoteBarter(), which never gave a profession discount on
  // the goods-for-goods exchange (#1223).
  const getMult = basket.mode === 'cash' ? pBuy * postMult : postMult;
  let getValue = 0;
  for (const [id, qty] of getE) getValue += getPrice(id).buy * getMult * qty;

  let giveValue = 0;
  let newCash: number;
  let rate: number | undefined;

  if (basket.mode === 'cash') {
    if (giveE.length > 0 && !postBuysForCash(here, year)) {
      throw new Error(`settleTrade: ${here.name} won't buy goods for coin — try Barter`);
    }
    const excluded = new Set(here.excludeBuyCategories ?? []);
    for (const [id, qty] of giveE) {
      const cat = ITEMS[id]?.category;
      if (cat && excluded.has(cat)) throw new Error(`settleTrade: ${here.name} won't buy ${id} (${cat})`);
      giveValue += getPrice(id).sell * (pSell * postMult) * qty;
    }
    newCash = Math.round(state.cash - getValue + giveValue);
    // Affordability on the NET (buy cost minus sell credit), not the gross
    // buy cost. Deliberate improvement over trade()'s gross-cost check: the
    // unified basket settles as one transaction, so sell proceeds can fund
    // the buys in the same confirm. (trade() rejects buy>cash even if sells
    // cover it; settleTrade allows it — see the equivalence test's
    // combined-basket case.)
    const netOwed = Math.ceil(getValue - giveValue);
    if (netOwed > state.cash) {
      throw new Error(`settleTrade: not enough cash ($${state.cash} < $${Math.round(getValue - giveValue)})`);
    }
    if (getE.length === 0 && state.cash - newCash >= 0) {
      throw new Error('settleTrade: nothing gained');
    }
  } else {
    for (const [id, qty] of giveE) {
      giveValue += getPrice(id).sell * postMult * prefRejectMult(here, id) * qty;
    }
    const cashOffer = Math.max(0, basket.cashOffer ?? 0);
    const giveTotal = giveValue + cashOffer;
    rate = getValue > 0 ? giveTotal / getValue : giveTotal === 0 ? 1 : Infinity;
    if (getE.length === 0) throw new Error('settleTrade: nothing gained');
    if (rate < BARTER_RATE_FLOOR) {
      throw new Error(`settleTrade: offer too thin (rate ${rate.toFixed(2)} < ${BARTER_RATE_FLOOR}) — add cash or goods`);
    }
    if (Math.ceil(cashOffer) > state.cash) {
      throw new Error(`settleTrade: not enough cash for the $${Math.round(cashOffer)} top-up`);
    }
    newCash = Math.round(state.cash - cashOffer);
  }

  const netCash = state.cash - newCash;

  const inventory: Record<string, number> = { ...state.inventory };
  for (const [id, qty] of giveE) inventory[id] = (inventory[id] ?? 0) - qty;
  for (const [id, qty] of getE) inventory[id] = (inventory[id] ?? 0) + qty;

  // #1072 — clothing condition bump for purchased items.
  // Buying new garments / footwear restores the relevant condition track:
  //   clothing category (coat, blanket, tent) → +6 garments per item
  //   boots (footwear, clothing category) → +25 footwear per item
  //   moccasins (footwear, native_trade category) → +15 footwear per item
  // Caps at 100. Applies only to bought items (basket.get).
  let garmentBump = 0;
  let footwearBump = 0;
  for (const [id, qty] of getE) {
    if (id === 'boots') {
      footwearBump += 25 * qty;
    } else if (id === 'moccasins') {
      footwearBump += 15 * qty;
    } else {
      const cat = ITEMS[id]?.category;
      if (cat === 'clothing') {
        garmentBump += 6 * qty;
      }
    }
  }

  const newWaterCap = computeWaterCap(state.wagon.model, inventory);

  const newClothingCondition = garmentBump > 0
    ? Math.min(100, getClothingCondition(state) + garmentBump)
    : (state.resources.clothingCondition ?? 100);
  const newFootwearCondition = footwearBump > 0
    ? Math.min(100, getFootwearCondition(state) + footwearBump)
    : (state.resources.footwearCondition ?? 100);

  let next: GameState = {
    ...state,
    inventory,
    cash: newCash,
    resources: {
      ...state.resources,
      waterCap: newWaterCap,
      water: Math.min(state.resources.water, newWaterCap),
      clothingCondition: newClothingCondition,
      footwearCondition: newFootwearCondition
    }
  };
  const purchaseMap: Record<string, number> = {};
  for (const [id, qty] of getE) purchaseMap[id] = (purchaseMap[id] ?? 0) + qty;
  next = recordPostPurchases(next, here, purchaseMap);

  const verb = basket.mode === 'cash' ? (netCash >= 0 ? 'Bought from' : 'Sold to') : 'Bartered at';
  next = {
    ...next,
    eventLog: [...next.eventLog, { day: next.day, text: `${verb} ${here.name}.` }]
  };

  return { state: next, netCash, getValue, giveValue, rate };
}
