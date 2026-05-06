// #303a Shopping decisions extracted from `dev/bot/runner.ts`. Each
// slice is a pure function on `WagonStateLike` + the post's stock set,
// returning the buy list this wagon would request from the post if it
// trades today. Player-bot composes all six slices to reproduce the
// pre-#303a `buildBotShoppingList`; #299 NPC post-restock calls just
// `pickFoodRestock`.
//
// The slices are intentionally narrow on inputs — they don't take the
// player's full GameState — so the same brain runs on the player bot
// driver, NPC tick driver, encountered-train wagon driver, and #284
// multiplayer remote-player slot.
//
// Quantities and thresholds preserved verbatim from the v8/v9 bot
// (#275). The food cap math has a known quirk — flour < 300 triggers
// `200 - have`, which is negative when the wagon already has 200-299
// lb. The downstream `trade()` would throw on the negative; the bot's
// catch-and-fallback path masks it. Preserving the quirk so this
// extraction is strictly behavior-equivalent (verified by deterministic
// CLI output). Fix is a separate ticket if it ever surfaces.

import type { WagonStateLike } from '../types';
import { hasLive } from '../professions/predicates';

export interface BuyOrder {
  item: string;
  qty: number;
}

export interface ShoppingInput {
  /** The wagon doing the shopping — player or NPC. */
  wagon: WagonStateLike;
  /** Items the post actually stocks (anything not in this set is skipped). */
  stock: Set<string>;
}

function aliveCount(wagon: WagonStateLike): number {
  return wagon.party.filter((m) => !m.dead).length || 1;
}

/** Survival warmth gear — coats + blankets per alive person, one tent +
 *  one pair of boots per alive person. Period: emigrants who left
 *  Independence without warm gear either bought at Kearny / Laramie or
 *  froze on the high plains. */
export function pickWarmthRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  const inv = wagon.inventory;
  const alive = aliveCount(wagon);
  const buys: BuyOrder[] = [];
  if (stock.has('coat')) {
    const need = Math.max(0, alive - (inv.coat ?? 0));
    if (need > 0) buys.push({ item: 'coat', qty: need });
  }
  if (stock.has('blanket')) {
    const need = Math.max(0, alive - (inv.blanket ?? 0));
    if (need > 0) buys.push({ item: 'blanket', qty: need });
  }
  if (stock.has('tent') && (inv.tent ?? 0) < 1) {
    buys.push({ item: 'tent', qty: 1 });
  }
  if (stock.has('boots')) {
    const need = Math.max(0, alive - (inv.boots ?? 0));
    if (need > 0) buys.push({ item: 'boots', qty: need });
  }
  return buys;
}

/** One-time utility kit: shovel, cookware, water_skin, rope. Gear the
 *  party functions without — buy on first stop that stocks it. */
export function pickEquipmentRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  const inv = wagon.inventory;
  const buys: BuyOrder[] = [];
  if (stock.has('shovel') && (inv.shovel ?? 0) < 1) buys.push({ item: 'shovel', qty: 1 });
  if (stock.has('cookware') && (inv.cookware ?? 0) < 1) buys.push({ item: 'cookware', qty: 1 });
  if (stock.has('water_skin') && (inv.water_skin ?? 0) < 2) buys.push({ item: 'water_skin', qty: 1 });
  if (stock.has('rope') && (inv.rope ?? 0) < 1) buys.push({ item: 'rope', qty: 1 });
  return buys;
}

/** Daily consumption rates (lb / soul / day) used to size restock targets.
 *  Sourced from `docs/historical-pass/08-post-restock.md` — Marcy 1859,
 *  Bryant 1846, Carpenter 1857. Period basket = the "Marcy 5" plus
 *  beans as a lower-priority addition. Jerky deliberately excluded —
 *  emigrants made their own from hunts; no diary records jerky as a
 *  post purchase. Hardtack / dried_fruit / cornmeal also excluded
 *  (outfitter-only or regional). */
const FOOD_RATES_LB_PER_DAY: Record<string, number> = {
  flour:  1.0,
  bacon:  0.3,
  sugar:  0.1,
  beans:  0.15,
  coffee: 0.05,
  salt:   0.02,
  // #308 — saleratus consumed at ~0.005 lb/lb-flour-eaten (#305 pastry).
  // For a 3-eater household at 1 lb flour/eater/day that's 0.015
  // lb/day. Period: Marcy 1859 prescribed 5 lb/year per family, fits
  // the ratio. Item is `category: 'tool'` in the catalog (it's also
  // used for stomach-settling + alkali water) but for restock purposes
  // it's a kitchen-staple — belongs adjacent to the period basket.
  saleratus: 0.015
};

/** Food restock priority order — matches Marcy 1859's enumeration
 *  ("bacon, flour, coffee, sugar, salt") plus beans last as period-low
 *  priority (most parties shipped beans from home, rarely restocked).
 *  Saleratus added per #308 audit — bot was running out around day
 *  135 and taking −1 morale daily for the rest of the journey. */
const FOOD_PRIORITY = ['flour', 'bacon', 'sugar', 'beans', 'coffee', 'salt', 'saleratus'] as const;

export interface FoodRestockOpts {
  /** Days-per-soul "low" floor — only restock when current food (in
   *  this category) is below this. Default 30 — period emigrants
   *  considered a month's food the trigger to top off, sized for
   *  longest inter-post stretches (Bridger→Hall is ~22 mountain
   *  days; Hall→Boise is ~25). #309 finding: 7-day floor caused bot
   *  to skip restocks at intermediate posts ("flour=81 lb is fine")
   *  and run out 30 days later. NPC #299 callers explicitly pass 5
   *  for a tighter household-cash-constrained buffer. */
  daysFloor?: number;
  /** Days-per-soul ceiling — buy up to this much, no further. Default 90.
   *  Period emigrants like Carpenter 1857 aimed for ~3-month buffers
   *  at major resupply for the longest legs. NPC callers pass a
   *  tighter 10-day cap. */
  daysCap?: number;
}

/** Food staples — the period-faithful "Marcy 5" basket: flour, bacon,
 *  coffee, sugar, salt — plus beans (lower priority). All scaled by
 *  alive-soul count × days. Trigger: any item below the floor.
 *  Buy quantity: fill to the cap. THIS is the slice #299 NPC post-restock
 *  calls (with `{ daysFloor: 5, daysCap: 10 }`). Player-bot uses defaults. */
export function pickFoodRestock(
  { wagon, stock }: ShoppingInput,
  opts: FoodRestockOpts = {}
): BuyOrder[] {
  const inv = wagon.inventory;
  const eaters = aliveCount(wagon);
  const daysFloor = opts.daysFloor ?? 30;
  const daysCap = opts.daysCap ?? 90;
  const buys: BuyOrder[] = [];
  for (const item of FOOD_PRIORITY) {
    if (!stock.has(item)) continue;
    const rate = FOOD_RATES_LB_PER_DAY[item];
    const have = inv[item] ?? 0;
    const floor = Math.max(1, Math.round(rate * eaters * daysFloor));
    if (have >= floor) continue;
    const cap = Math.max(floor, Math.round(rate * eaters * daysCap));
    const qty = cap - have;
    if (qty > 0) buys.push({ item, qty });
  }
  return buys;
}

/** Hunter-conditional restock: ammo (gunpowder / lead_balls /
 *  percussion_caps) and grain for ox-feed during poor grazing.
 *  Salt was here pre-#299; moved to `pickFoodRestock` since period
 *  reality is that every household carried it (cooking + occasional
 *  meat curing), not just hunter-led wagons. Only fires when a Hunter
 *  is alive — non-hunter wagons skip ammo even when stocked. */
export function pickHunterRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  const inv = wagon.inventory;
  const buys: BuyOrder[] = [];
  if (stock.has('grain') && (inv.grain ?? 0) < 30 * Math.max(1, aliveCount(wagon))) {
    buys.push({ item: 'grain', qty: 30 });
  }
  if (!hasLive(wagon, 'hunter')) return buys;
  if (stock.has('gunpowder') && (inv.gunpowder ?? 0) < 30) {
    buys.push({ item: 'gunpowder', qty: 30 - (inv.gunpowder ?? 0) });
  }
  if (stock.has('lead_balls') && (inv.lead_balls ?? 0) < 30) {
    buys.push({ item: 'lead_balls', qty: 30 - (inv.lead_balls ?? 0) });
  }
  if (stock.has('percussion_caps') && (inv.percussion_caps ?? 0) < 30) {
    buys.push({ item: 'percussion_caps', qty: 30 - (inv.percussion_caps ?? 0) });
  }
  return buys;
}

/** Blacksmith-conditional restock: spare wagon parts (axle, wheel,
 *  tongue, tar_bucket). The half-price smithy repair (#176) makes
 *  these worth carrying since a Blacksmith on board can apply them
 *  cheaply. Only fires when a Blacksmith is alive — non-smith wagons
 *  skip even when stocked. */
export function pickRepairRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  if (!hasLive(wagon, 'blacksmith')) return [];
  const inv = wagon.inventory;
  const buys: BuyOrder[] = [];
  if (stock.has('axle') && (inv.axle ?? 0) < 1) buys.push({ item: 'axle', qty: 1 });
  if (stock.has('wheel') && (inv.wheel ?? 0) < 1) buys.push({ item: 'wheel', qty: 1 });
  if (stock.has('tongue') && (inv.tongue ?? 0) < 1) buys.push({ item: 'tongue', qty: 1 });
  if (stock.has('tar_bucket') && (inv.tar_bucket ?? 0) < 1) buys.push({ item: 'tar_bucket', qty: 1 });
  return buys;
}

/** Medicine restock: quinine, bandages, laudanum, dovers_powder,
 *  calomel, paregoric, epsom_salts, dried_fruit (scurvy auto-cure).
 *  Period: emigrants who could afford it stocked at every major post
 *  — quinine for cholera/typhoid, bandages for injury, laudanum for
 *  pain, dover's powder for diarrhea, calomel/paregoric for dysentery,
 *  epsom salts for general purgative.
 *  #275 v10 — floors calibrated to Marcy 1859: a 5-person family on a
 *  6-month journey carried 30-60 doses of each major drug. The pre-v10
 *  floors of 3-4 were a fraction of period reality and the bot ran the
 *  chest dry by month 3, trapping it in chronic-disease rest cycles. */
export function pickMedicineRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  const inv = wagon.inventory;
  const buys: BuyOrder[] = [];
  if (stock.has('quinine') && (inv.quinine ?? 0) < 10) buys.push({ item: 'quinine', qty: 10 - (inv.quinine ?? 0) });
  if (stock.has('bandages') && (inv.bandages ?? 0) < 8) buys.push({ item: 'bandages', qty: 8 - (inv.bandages ?? 0) });
  if (stock.has('laudanum') && (inv.laudanum ?? 0) < 6) buys.push({ item: 'laudanum', qty: 6 - (inv.laudanum ?? 0) });
  if (stock.has('dovers_powder') && (inv.dovers_powder ?? 0) < 4) buys.push({ item: 'dovers_powder', qty: 4 - (inv.dovers_powder ?? 0) });
  if (stock.has('calomel') && (inv.calomel ?? 0) < 6) buys.push({ item: 'calomel', qty: 6 - (inv.calomel ?? 0) });
  if (stock.has('paregoric') && (inv.paregoric ?? 0) < 5) buys.push({ item: 'paregoric', qty: 5 - (inv.paregoric ?? 0) });
  if (stock.has('epsom_salts') && (inv.epsom_salts ?? 0) < 3) buys.push({ item: 'epsom_salts', qty: 3 - (inv.epsom_salts ?? 0) });
  if (stock.has('dried_fruit') && (inv.dried_fruit ?? 0) < 5) buys.push({ item: 'dried_fruit', qty: 5 - (inv.dried_fruit ?? 0) });
  return buys;
}

export interface ComposeOpts {
  /** Forwarded to `pickFoodRestock` — persona-tunable since #303c. */
  food?: FoodRestockOpts;
}

/** Compose all 6 slices in the same order the pre-#303a
 *  `buildBotShoppingList` did: warmth → equipment → food → hunter →
 *  repair → medicine. Used by the player-bot driver; NPC drivers can
 *  call individual slices instead. */
export function composeShoppingList(
  input: ShoppingInput,
  opts: ComposeOpts = {}
): BuyOrder[] {
  return [
    ...pickWarmthRestock(input),
    ...pickEquipmentRestock(input),
    ...pickFoodRestock(input, opts.food),
    ...pickHunterRestock(input),
    ...pickRepairRestock(input),
    ...pickMedicineRestock(input)
  ];
}

/** Convenience predicate — anything missing across the warmth + tent
 *  baseline. Used by the player-bot's `shouldTradeAtPost` to trigger
 *  even when food is fine. */
export function missingSurvivalGear(wagon: WagonStateLike): boolean {
  const inv = wagon.inventory;
  const alive = aliveCount(wagon);
  return (inv.coat ?? 0) < alive
    || (inv.blanket ?? 0) < alive
    || (inv.tent ?? 0) < 1;
}

