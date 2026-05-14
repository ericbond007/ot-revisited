// #915 — General item-for-item barter at trading posts. Period reality:
// emigrants routinely traded staples for medicine / repairs / fresh
// gear at posts (Bryant 1846, Royce 1849, Carpenter 1857, Palmer 1845).
// Cash was scarce on the trail; goods circulated.
//
// This module is the pure helper layer:
//   - quoteBarter(state, give, receive) → rate + fairness
//   - applyBarter(state, give, receive, rng) → mutated state
//   - findBarterableItems(state, here) → what the player could offer
//
// Player UI (TradePostModal barter tab) and bot/NPC integration
// (runner.ts + wagon-train.ts) are layered on top.

import type { GameState, ItemId } from '../types';
import type { Rng } from '../rng';
import type { Landmark } from '../content/landmarks';
import { getLandmark } from '../content/landmarks';
import { getPrice } from '../content/prices';

/** Minimum acceptable rate (give-value / receive-value). Below this,
 *  the player would be receiving significantly more than they give,
 *  and the post refuses (Bryant 1846: "lawful trade but not fair
 *  exchange"). 0.5 means the post requires the player to give at
 *  least half the value of what they receive. */
export const BARTER_RATE_FLOOR = 0.5;

/** Maximum acceptable rate. Above this, the player would be giving
 *  more than they receive — and even on the trail, period emigrants
 *  walked away from trades that obviously soaked them. 1.05 leaves a
 *  sliver above par for desperate-emigrant cases (low food, hungry
 *  family, willing to take a slight loss for guaranteed flour). */
export const BARTER_RATE_CEIL = 1.05;

/** Per-post premium on preferred items. Period anchor: HBC at Boise
 *  paid ~25% premium for buffalo robes (Carpenter 1857); Bridger
 *  5-15% for horses (Hastings 1845); missions ~20% for fresh meat. */
export const BARTER_POST_PREFERENCE_BONUS = 0.15;

/** Per-post discount on refused items. Period: Bryant 1846 on Bridger
 *  refusing whiskey — "double the rate of any other staple." 40%
 *  captures the punitive posture without snapping every trade. */
export const BARTER_POST_REJECT_PENALTY = 0.40;

export interface BarterOffer {
  item: ItemId;
  qty: number;
}

export interface BarterQuote {
  give: BarterOffer;
  receive: BarterOffer;
  /** Give-side value (after post preference / rejection) divided by
   *  receive-side value. >1 favors the player, <1 favors the post. */
  rate: number;
  /** True iff `rate` falls within [FLOOR, CEIL] AND the give item is
   *  not explicitly refused at this post AND the post allows barter. */
  fair: boolean;
}

function postOf(state: GameState): Landmark | null {
  return state.location.atLandmarkId
    ? getLandmark(state.location.atLandmarkId)
    : null;
}

/** Pure rate calculation. Does NOT validate inventory or stock —
 *  callers should check those before invoking applyBarter.
 *
 *  Algorithm:
 *    giveValue = sell(give.item) × postMult × giveQty × preference
 *                                                     × rejection
 *    receiveValue = buy(receive.item) × postMult × receiveQty
 *    rate = giveValue / receiveValue
 *    fair = FLOOR ≤ rate ≤ CEIL AND barterEnabled !== false
 *
 *  Returns a quote with `fair = false` when the post disables barter
 *  (so callers can surface the reason consistently). */
export function quoteBarter(
  state: GameState,
  give: BarterOffer,
  receive: BarterOffer
): BarterQuote {
  const post = postOf(state);
  if (!post) {
    // No post in scope (open trail). Quote is degenerate; nothing to
    // barter with.
    return { give, receive, rate: 0, fair: false };
  }
  const postMult = post.priceMultiplier ?? 1.0;
  const preferred = new Set(post.barterPreferred ?? []);
  const refused = new Set(post.barterRefused ?? []);
  const barterEnabled = post.barterEnabled !== false;

  let giveValue = 0;
  try {
    giveValue = getPrice(give.item).sell * postMult * give.qty;
  } catch {
    return { give, receive, rate: 0, fair: false };
  }
  let receiveValue = 0;
  try {
    receiveValue = getPrice(receive.item).buy * postMult * receive.qty;
  } catch {
    return { give, receive, rate: 0, fair: false };
  }

  let modifier = 1.0;
  if (preferred.has(give.item)) modifier *= (1 + BARTER_POST_PREFERENCE_BONUS);
  if (refused.has(give.item)) modifier *= (1 - BARTER_POST_REJECT_PENALTY);

  const adjusted = giveValue * modifier;
  const rate = receiveValue > 0 ? adjusted / receiveValue : 0;
  const fair = barterEnabled
    && rate >= BARTER_RATE_FLOOR
    && rate <= BARTER_RATE_CEIL;
  return { give, receive, rate, fair };
}

/** Validate + apply a barter trade. Throws on:
 *    - not at a landmark
 *    - post has barterEnabled === false
 *    - give-qty exceeds inventory
 *    - unfair quote (rate outside [FLOOR, CEIL])
 *  Otherwise mutates inventory and appends an eventLog entry. */
export function applyBarter(
  state: GameState,
  give: BarterOffer,
  receive: BarterOffer,
  _rng: Rng
): GameState {
  const post = postOf(state);
  if (!post) {
    throw new Error('barter: not at a landmark');
  }
  if (post.barterEnabled === false) {
    throw new Error(`barter: ${post.name} runs cash-only`);
  }

  const have = state.inventory[give.item] ?? 0;
  if (have < give.qty) {
    throw new Error(`barter: insufficient ${give.item} (have ${have}, need ${give.qty})`);
  }

  const quote = quoteBarter(state, give, receive);
  if (!quote.fair) {
    throw new Error(
      `barter: unfair rate (${quote.rate.toFixed(2)}, must be `
      + `${BARTER_RATE_FLOOR}-${BARTER_RATE_CEIL})`
    );
  }

  const inventory = {
    ...state.inventory,
    [give.item]: have - give.qty,
    [receive.item]: (state.inventory[receive.item] ?? 0) + receive.qty,
  };

  const giveLabel = give.item.replace(/_/g, ' ');
  const recvLabel = receive.item.replace(/_/g, ' ');
  const text = `Bartered ${give.qty} ${giveLabel} for ${receive.qty} ${recvLabel} at ${post.name}.`;

  return {
    ...state,
    inventory,
    eventLog: [...state.eventLog, { day: state.day, text }],
  };
}

export interface BarterableItem {
  item: ItemId;
  qty: number;
  /** Per-unit trade value (sell × postMult × preference/rejection)
   *  the post will credit toward a receive-side purchase. Sorted
   *  high-to-low so callers can prioritize. */
  tradeValue: number;
}

/** Items the player has that the post will take in barter. Refused
 *  items are still surfaced (with reduced trade values) so the player
 *  / bot can see they're a poor exchange rather than blocked. */
export function findBarterableItems(state: GameState, here: Landmark): BarterableItem[] {
  if (here.barterEnabled === false) return [];
  const postMult = here.priceMultiplier ?? 1.0;
  const preferred = new Set(here.barterPreferred ?? []);
  const refused = new Set(here.barterRefused ?? []);

  const out: BarterableItem[] = [];
  for (const [id, qty] of Object.entries(state.inventory)) {
    if (qty <= 0) continue;
    let sellPrice: number;
    try {
      sellPrice = getPrice(id).sell;
    } catch {
      continue;
    }
    if (sellPrice <= 0) continue;
    let modifier = 1.0;
    if (preferred.has(id)) modifier *= (1 + BARTER_POST_PREFERENCE_BONUS);
    if (refused.has(id)) modifier *= (1 - BARTER_POST_REJECT_PENALTY);
    out.push({
      item: id as ItemId,
      qty,
      tradeValue: sellPrice * postMult * modifier
    });
  }
  return out.sort((a, b) => b.tradeValue - a.tradeValue);
}
