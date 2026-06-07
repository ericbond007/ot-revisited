import type { GameState } from '../types';
import { getItem, type ItemCategory } from '../content/items';
import type { Landmark } from '../content/landmarks';

// Trading-post stock quantities. Each post publishes a list of item IDs
// it sells (`stock`) plus a `stockScale` multiplier. Per-item quantity
// is derived from a category default × scale, so small mountain-man
// posts don't have to hand-roll 30 numbers.
//
// Remaining qty is tracked in `flags._postStock[landmarkId]`:
//   {
//     bought: { flour: 40, lead_balls: 10, ... } // running totals
//     restockedDay: 123                          // when bought was last zeroed
//   }
//
// Monthly restock: if it's been >=30 days since the last restock when
// the party arrives, bought resets to {} and restockedDay updates. This
// mimics the seasonal freight wagons that resupplied actual posts.

/** Per-category default stock qty at a baseline (scale = 1.0) post. */
export const DEFAULT_STOCK_QTY: Record<ItemCategory, number> = {
  food: 120,          // lbs
  medicine: 10,
  tool: 4,
  wagon_part: 3,
  weapon: 2,
  ammo: 300,          // powder / ball / caps sold by the piece
  clothing: 6,
  livestock: 8,
  feed: 80,           // grain lbs
  comfort: 12,
  native_trade: 15
};

export const RESTOCK_DAYS = 30;

interface PostStockState {
  bought: Record<string, number>;
  restockedDay: number;
}

function readPostStock(state: GameState, landmarkId: string): PostStockState | null {
  const root = state.flags._postStock as Record<string, PostStockState> | undefined;
  const entry = root?.[landmarkId];
  if (!entry) return null;
  return entry;
}

function writePostStock(
  state: GameState,
  landmarkId: string,
  entry: PostStockState
): GameState {
  const root = (state.flags._postStock ?? {}) as Record<string, PostStockState>;
  return {
    ...state,
    flags: {
      ...state.flags,
      _postStock: { ...root, [landmarkId]: entry }
    }
  };
}

// #1245 — desert-provisioning guarantee. A 4-adult party needs 4 water_bags
// before a >=200 mi dry gap (gapAwareWaterBagTarget). Low-stockScale posts like
// Fort Boise (0.6) would otherwise cap at Math.ceil(4 * 0.6) = 3, making the
// bot's target unreachable. A flat floor of 4 everywhere is harmless: water_bag
// is a tool (not a balance-sensitive consumable), and 4 vessels is a reasonable
// minimum shelf at any trading post on the trail.
const WATER_GEAR_FLOOR = 4;

/** Baseline qty for (item x post), independent of what's already been bought. */
export function postBaselineQty(landmark: Landmark, itemId: string): number {
  if (!landmark.stock?.includes(itemId)) return 0;
  const scale = landmark.stockScale ?? 1.0;
  const meta = getItem(itemId);
  const base = DEFAULT_STOCK_QTY[meta.category];
  const scaled = Math.max(1, Math.ceil(base * scale));
  // Apply per-item floors after scaling.
  if (itemId === 'water_bag') return Math.max(scaled, WATER_GEAR_FLOOR);
  return scaled;
}

/** Remaining qty for (item × post) after subtracting what's been bought. */
export function postRemainingQty(
  state: GameState,
  landmark: Landmark,
  itemId: string
): number {
  const baseline = postBaselineQty(landmark, itemId);
  if (baseline <= 0) return 0;
  const entry = readPostStock(state, landmark.id);
  const bought = entry?.bought[itemId] ?? 0;
  return Math.max(0, baseline - bought);
}

/** Called on post arrival — resets the bought map if we're past the
 *  restock window. First-time arrivals initialize the record.
 */
export function restockPostIfDue(state: GameState, landmark: Landmark): GameState {
  if (landmark.kind !== 'trading_post') return state;
  const entry = readPostStock(state, landmark.id);
  if (!entry) {
    return writePostStock(state, landmark.id, { bought: {}, restockedDay: state.day });
  }
  if (state.day - entry.restockedDay >= RESTOCK_DAYS) {
    return writePostStock(state, landmark.id, { bought: {}, restockedDay: state.day });
  }
  return state;
}

/** Records purchases at a post. Call once after a successful trade; the
 *  `purchases` map is itemId → qty. Clamps each line at the remaining
 *  baseline so a race with stale UI can't over-draw (the trade action
 *  should also validate up front).
 */
export function recordPostPurchases(
  state: GameState,
  landmark: Landmark,
  purchases: Record<string, number>
): GameState {
  if (landmark.kind !== 'trading_post') return state;
  const entry = readPostStock(state, landmark.id)
    ?? { bought: {}, restockedDay: state.day };
  const bought = { ...entry.bought };
  for (const [itemId, qty] of Object.entries(purchases)) {
    if (!qty || qty <= 0) continue;
    const prev = bought[itemId] ?? 0;
    const baseline = postBaselineQty(landmark, itemId);
    bought[itemId] = Math.min(baseline, prev + qty);
  }
  return writePostStock(state, landmark.id, { ...entry, bought });
}
