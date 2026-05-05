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

/** Food staples: flour, bacon, beans, jerky. v8 trace showed leaving
 *  Bridger at 200 lb flour and starving before Boise; cap pushed to
 *  300 to cover the long Bridger→Hall stretch. Quantities sized for
 *  a 3-person party — scale at the call site for unusually large
 *  parties. THIS is the slice #299 NPC post-restock will call. */
export function pickFoodRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  const inv = wagon.inventory;
  const buys: BuyOrder[] = [];
  if (stock.has('flour') && (inv.flour ?? 0) < 300) {
    buys.push({ item: 'flour', qty: 200 - (inv.flour ?? 0) });
  }
  if (stock.has('bacon') && (inv.bacon ?? 0) < 80) {
    buys.push({ item: 'bacon', qty: 60 - (inv.bacon ?? 0) });
  }
  if (stock.has('beans') && (inv.beans ?? 0) < 50) {
    buys.push({ item: 'beans', qty: 40 - (inv.beans ?? 0) });
  }
  if (stock.has('jerky') && (inv.jerky ?? 0) < 30) {
    buys.push({ item: 'jerky', qty: 20 - (inv.jerky ?? 0) });
  }
  return buys;
}

/** Hunter-conditional restock: ammo (gunpowder / lead_balls /
 *  percussion_caps), salt for fresh-meat preservation (#122), and
 *  grain for ox-feed during poor grazing. Period: blacksmith was the
 *  emigrant's value-multiplier on long stretches; same shape with
 *  hunter and ammo. Only fires when a Hunter is alive on the wagon —
 *  non-hunter wagons skip these even when stocked. */
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
  if (stock.has('salt') && (inv.salt ?? 0) < 10) {
    buys.push({ item: 'salt', qty: 10 - (inv.salt ?? 0) });
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
 *  epsom salts for general purgative. */
export function pickMedicineRestock({ wagon, stock }: ShoppingInput): BuyOrder[] {
  const inv = wagon.inventory;
  const buys: BuyOrder[] = [];
  if (stock.has('quinine') && (inv.quinine ?? 0) < 4) buys.push({ item: 'quinine', qty: 4 - (inv.quinine ?? 0) });
  if (stock.has('bandages') && (inv.bandages ?? 0) < 4) buys.push({ item: 'bandages', qty: 4 - (inv.bandages ?? 0) });
  if (stock.has('laudanum') && (inv.laudanum ?? 0) < 3) buys.push({ item: 'laudanum', qty: 3 - (inv.laudanum ?? 0) });
  if (stock.has('dovers_powder') && (inv.dovers_powder ?? 0) < 3) buys.push({ item: 'dovers_powder', qty: 3 - (inv.dovers_powder ?? 0) });
  if (stock.has('calomel') && (inv.calomel ?? 0) < 3) buys.push({ item: 'calomel', qty: 3 - (inv.calomel ?? 0) });
  if (stock.has('paregoric') && (inv.paregoric ?? 0) < 3) buys.push({ item: 'paregoric', qty: 3 - (inv.paregoric ?? 0) });
  if (stock.has('epsom_salts') && (inv.epsom_salts ?? 0) < 3) buys.push({ item: 'epsom_salts', qty: 3 - (inv.epsom_salts ?? 0) });
  if (stock.has('dried_fruit') && (inv.dried_fruit ?? 0) < 5) buys.push({ item: 'dried_fruit', qty: 5 - (inv.dried_fruit ?? 0) });
  return buys;
}

/** Compose all 6 slices in the same order the pre-#303a
 *  `buildBotShoppingList` did: warmth → equipment → food → hunter →
 *  repair → medicine. Used by the player-bot driver; NPC drivers can
 *  call individual slices instead. */
export function composeShoppingList(input: ShoppingInput): BuyOrder[] {
  return [
    ...pickWarmthRestock(input),
    ...pickEquipmentRestock(input),
    ...pickFoodRestock(input),
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

