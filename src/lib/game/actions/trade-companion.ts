// #289 — Inter-wagon trading at any rest stop. The "marketplace of
// small swaps" Helen Carpenter (1857) describes — flour for coffee,
// sugar for bullets, a daughter's spare dress for a needle and thread.
// Period reality: emigrant diaries cluster these exchanges at camp
// halts, not posts.
//
// Distinct from `actions/trade.ts` (player ↔ trading post) — this is
// player ↔ companion wagon, both sides have inventories and cash, and
// the NPC's willingness depends on morale + their own need.

import type { GameState, NpcWagonState } from '../types';
import { getPrice } from '../content/prices';

// Acceptance thresholds, calibrated against `getPrice` baselines.
//
// A "fair" barter is within 30% of even value. NPCs accept most fair
// barters and most gifts. Lopsided barters where the NPC gives more
// than they get (the player is taking advantage) get harder as the
// imbalance grows; very unhappy NPCs decline gifts entirely.
const FAIR_BARTER_TOLERANCE = 0.3;
const HOSTILE_MORALE_FLOOR = 25;

export interface TradeLine {
  item: string;
  qty: number;
}

export interface CompanionTradeOffer {
  /** From the player's wagon to the companion. */
  give?: TradeLine[];
  /** From the companion's wagon to the player. */
  take?: TradeLine[];
  /** Cash flowing player → companion (positive). */
  giveCash?: number;
  /** Cash flowing companion → player (positive). */
  takeCash?: number;
}

export interface CompanionTradeResult {
  state: GameState;
  accepted: boolean;
  /** Why the NPC declined (only set when `accepted=false`). */
  declineReason?: string;
}

function lineValue(line: TradeLine): number {
  // Use the buy-side price as the period-realistic "value" — it
  // matches how emigrants thought about goods (purchase cost back
  // east). Skip items without a price entry (zero value, like
  // `wagon` itself).
  try {
    const p = getPrice(line.item);
    return p.buy * line.qty;
  } catch {
    return 0;
  }
}

function totalValue(lines: TradeLine[] | undefined): number {
  if (!lines) return 0;
  return lines.reduce((sum, l) => sum + lineValue(l), 0);
}

function inventoryHas(
  inv: Record<string, number>,
  lines: TradeLine[] | undefined
): boolean {
  if (!lines) return true;
  for (const l of lines) {
    if ((inv[l.item] ?? 0) < l.qty) return false;
  }
  return true;
}

function applyLines(
  inv: Record<string, number>,
  give: TradeLine[] | undefined,
  receive: TradeLine[] | undefined
): Record<string, number> {
  const next = { ...inv };
  if (give) {
    for (const l of give) {
      next[l.item] = (next[l.item] ?? 0) - l.qty;
    }
  }
  if (receive) {
    for (const l of receive) {
      next[l.item] = (next[l.item] ?? 0) + l.qty;
    }
  }
  return next;
}

function isHungry(wagon: NpcWagonState): boolean {
  // Wagon counts as hungry when total food is less than ~5 days for
  // the alive party. Hungry wagons accept food gifts at any morale.
  const eaters = wagon.party.filter((p) => !p.dead).length;
  if (eaters === 0) return false;
  const FOOD_KEYS = ['flour', 'bacon', 'beans', 'jerky', 'pemmican', 'salt_pork', 'hardtack', 'cornmeal', 'dried_fruit'];
  const food = FOOD_KEYS.reduce((sum, k) => sum + (wagon.inventory[k] ?? 0), 0);
  return food < eaters * 5 * 2.5;
}

function offerIsFoodGift(offer: CompanionTradeOffer): boolean {
  if (!offer.give || offer.give.length === 0) return false;
  if (offer.take && offer.take.length > 0) return false;
  if ((offer.takeCash ?? 0) > 0) return false;
  const FOOD_KEYS = ['flour', 'bacon', 'beans', 'jerky', 'pemmican', 'salt_pork', 'hardtack', 'cornmeal', 'dried_fruit'];
  return offer.give.every((l) => FOOD_KEYS.includes(l.item));
}

/** NPC's reaction to a proposed trade. Returns `null` to accept,
 *  otherwise a string reason for decline. The logic blends value
 *  fairness with morale + need. */
function npcDecision(
  wagon: NpcWagonState,
  offer: CompanionTradeOffer
): string | null {
  // Hostile-morale wagons reject everything except food gifts to
  // hungry mouths.
  const hungryFoodGift = isHungry(wagon) && offerIsFoodGift(offer);
  if (wagon.morale < HOSTILE_MORALE_FLOOR && !hungryFoodGift) {
    return 'They want nothing to do with you today.';
  }
  // Pure gift (player gives, takes nothing) — accepted unless wagon
  // morale is rock-bottom.
  const isGift =
    (!offer.take || offer.take.length === 0)
    && (offer.takeCash ?? 0) === 0;
  if (isGift) return null;

  const playerGives = totalValue(offer.give) + (offer.giveCash ?? 0);
  const npcGives = totalValue(offer.take) + (offer.takeCash ?? 0);
  if (npcGives === 0) return null; // pure gift checked above; defensive
  const ratio = playerGives / npcGives;
  // Player giving at least (1 - tolerance) × the value of what NPC gives.
  if (ratio >= 1 - FAIR_BARTER_TOLERANCE) return null;
  // Lopsided. Hungry wagons may still accept food trades for value
  // they can use. Otherwise decline with a reason scaled to badness.
  if (ratio < 0.5) {
    return `They won't take that — your offer's not half the asking value.`;
  }
  return `They'd want closer to even — try sweetening the offer.`;
}

/** Settle a trade between the player's wagon and a companion.
 *  Atomic: both wagons mutate in one step, or nothing changes.
 *  Throws on bad inputs (negative qty, missing inventory, missing
 *  cash); returns `{ accepted: false, declineReason }` if the NPC
 *  refuses the deal. */
export function tradeWithCompanion(
  state: GameState,
  wagonId: string,
  offer: CompanionTradeOffer
): CompanionTradeResult {
  if (!state.wagonTrain) {
    throw new Error('tradeWithCompanion: not in a wagon train');
  }
  const idx = state.wagonTrain.companions.findIndex((c) => c.id === wagonId);
  if (idx === -1) {
    throw new Error(`tradeWithCompanion: no wagon ${wagonId}`);
  }
  const wagon = state.wagonTrain.companions[idx];
  if (wagon.outcome !== 'in-progress') {
    throw new Error(`tradeWithCompanion: ${wagon.name} is no longer with the train`);
  }
  // Validate quantities.
  for (const l of [...(offer.give ?? []), ...(offer.take ?? [])]) {
    if (l.qty <= 0) throw new Error(`tradeWithCompanion: bad qty for ${l.item}`);
  }
  if ((offer.giveCash ?? 0) < 0 || (offer.takeCash ?? 0) < 0) {
    throw new Error('tradeWithCompanion: negative cash');
  }
  // Player has the give items + cash?
  if (!inventoryHas(state.inventory, offer.give)) {
    throw new Error('tradeWithCompanion: player lacks offered items');
  }
  if (state.cash < (offer.giveCash ?? 0)) {
    throw new Error('tradeWithCompanion: player lacks offered cash');
  }
  // Wagon has the take items + cash?
  if (!inventoryHas(wagon.inventory, offer.take)) {
    return {
      state,
      accepted: false,
      declineReason: `${wagon.name} doesn't have everything you asked for.`
    };
  }
  if (wagon.cash < (offer.takeCash ?? 0)) {
    return {
      state,
      accepted: false,
      declineReason: `${wagon.name} can't cover that much cash.`
    };
  }

  // NPC decision.
  const decline = npcDecision(wagon, offer);
  if (decline !== null) {
    return { state, accepted: false, declineReason: decline };
  }

  // Apply.
  const playerInv = applyLines(state.inventory, offer.give, offer.take);
  const wagonInv = applyLines(wagon.inventory, offer.take, offer.give);
  const playerCash = state.cash - (offer.giveCash ?? 0) + (offer.takeCash ?? 0);
  const wagonCash = wagon.cash - (offer.takeCash ?? 0) + (offer.giveCash ?? 0);
  // Gift (give-only) lifts wagon morale a bit; lopsided "barters
  // toward player advantage" cost wagon morale. Fair barters neutral.
  let wagonMoraleDelta = 0;
  if (
    (!offer.take || offer.take.length === 0)
    && (offer.takeCash ?? 0) === 0
  ) {
    wagonMoraleDelta = 4;
  } else {
    const playerGives = totalValue(offer.give) + (offer.giveCash ?? 0);
    const npcGives = totalValue(offer.take) + (offer.takeCash ?? 0);
    if (npcGives > 0 && playerGives < npcGives * 0.85) {
      wagonMoraleDelta = -2;
    }
  }

  // Compose the log line — short and plain.
  const summary = describeTrade(offer, wagon.name);
  const next: GameState = {
    ...state,
    inventory: playerInv,
    cash: playerCash,
    wagonTrain: {
      ...state.wagonTrain,
      companions: state.wagonTrain.companions.map((c, i) =>
        i === idx
          ? {
              ...c,
              inventory: wagonInv,
              cash: wagonCash,
              morale: Math.max(0, Math.min(100, c.morale + wagonMoraleDelta)),
              eventLog: [
                ...c.eventLog,
                { day: state.day, text: summary }
              ]
            }
          : c
      )
    },
    eventLog: [...state.eventLog, { day: state.day, text: summary }]
  };
  return { state: next, accepted: true };
}

function describeTrade(offer: CompanionTradeOffer, wagonName: string): string {
  const parts: string[] = [];
  const giveText = (offer.give ?? []).map((l) => `${l.qty} ${l.item}`).join(', ');
  const takeText = (offer.take ?? []).map((l) => `${l.qty} ${l.item}`).join(', ');
  if (giveText) parts.push(`gave ${giveText}`);
  if ((offer.giveCash ?? 0) > 0) parts.push(`paid $${offer.giveCash}`);
  if (takeText) parts.push(`took ${takeText}`);
  if ((offer.takeCash ?? 0) > 0) parts.push(`got $${offer.takeCash}`);
  return `Traded with ${wagonName} — ${parts.join(', ')}.`;
}
