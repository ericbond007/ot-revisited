import type { ProfessionId } from '../types';
import { getProfession } from './professions';
import { DEFAULT_WAGON_MODEL, getWagon, type WagonModelId } from './wagons';

export interface StarterKit {
  cash: number;
  oxen: number;
  inventory: Record<string, number>;
}

// Audited starter kit (#102 → #888c):
//
// Pre-#888c, bullets / clothing / rifle were OUTFITTER-bought items.
// Professions like Hunter / Gunsmith brought ammo as starterGear,
// which was the gear-discount #888 set out to remove.
//
// Post-#888c, BASE_KIT eats the period-emigrant outfitter package:
// rifle, gunpowder + lead_balls + percussion_caps, tent, rope, and
// per-soul coat / blanket / boots (added in buildStarterKit since
// BASE doesn't know partySize). Marcy 1859 prescribes ALL of these
// as the floor — they aren't optional. Profession choice is now
// purely flavor + mechanical bonus, no save-a-buck. Profession.
// starterGear cleanup happens in #890.
//
// Still NOT in BASE:
//  - Water skins — each wagon model declares its own baseWaterCapGal
//    via the built-in keg. Water skins are an outfitter upgrade.
//  - Wagon spare-parts — players buy at outfitter on their own weight
//    budget (#107 honesty).
export const BASE_KIT: StarterKit = {
  cash: 400,
  oxen: 4,
  inventory: {
    flour:     300,
    beans:      50,
    bacon:      30,
    coffee:      2,
    salt:        2,
    // #305 saleratus — period baking soda. 4 units (2 lb) lasts a
    // 3-eater family ~4 months at 1 lb flour/eater/day; player needs
    // to refill at one post mid-trip for a full Independence→Oregon
    // run. Marcy 1859 outfit prescribes 5 lb per year — generous half.
    saleratus:   4,
    // #275 v10 — period-realistic family medicine chest. Marcy 1859
    // *The Prairie Traveler* prescribes 1-2 oz quinine sulfate, 1-2 oz
    // calomel, 4 oz laudanum, 2 oz paregoric, 2 oz Dover's powder for a
    // 5-person family on a 6-month journey (≈30-60 doses each).
    // Bryant 1846 (Russell Party): "all the usual articles in liberal
    // supply." Royce 1849: "quinine — we had a great deal." Carpenter
    // 1857: restocked the chest at every fort. This baseline gives a
    // family without a Doctor a small but real chest; the Doctor
    // profession layers a full professional supply on top (#890 audit
    // may rebalance the duplicate coverage).
    quinine:     4,
    calomel:     2,
    laudanum:    2,
    paregoric:   2,
    bandages:    8,
    shovel:      1,
    cookware:    1,
    // #888c — period outfitter package. Marcy 1859 lists these as the
    // floor for any wagon leaving Independence. Pre-#888c making them
    // outfitter-only purchases was a game-mechanic artifact, not period.
    rifle:           1,
    gunpowder:      30,
    lead_balls:     30,
    percussion_caps: 30,
    tent:            1,
    rope:            1
    // Yokes added per-wagon by buildStarterKit — each wagon model
    // needs a different count to hitch its full team (#107).
    // Per-soul gear (coat / blanket / boots) added by buildStarterKit
    // since BASE doesn't know partySize.
  }
};

export interface BuildStarterKitOpts {
  /** #888b — when false, skip the BASE_KIT layer entirely. Player
   *  veterans who want to provision themselves at the outfitter pick
   *  this. Default true (the wizard checkbox defaults ON). When false,
   *  the player gets +$250 cash (BASE_KIT outfitter-replacement value)
   *  on top of the $400 baseline so they can re-buy what they need.
   *  Total: $650 cash, no flour, no medicine, no rifle, no clothing,
   *  no tent. Player provisions from scratch at the Independence
   *  outfitter. */
  includeStarterKit?: boolean;
}

/** #888b — outfitter-equivalent cash refund when player skips the
 *  starter kit. Calibrated against the cost of buying the BASE_KIT
 *  contents (food + medicine + rifle + ammo + tent + rope + per-soul
 *  clothing) at Independence prices for a 4-soul reference family
 *  (~$213). $250 covers the buy-back plus a small buffer for the
 *  veteran's choice — period reality says wealthy emigrants who
 *  outfitted at Independence (rather than home) came with extra cash
 *  to spend on regional specialties. */
const STARTER_KIT_REFUND = 250;

export function buildStarterKit(
  professions: ProfessionId[],
  wagonModel: WagonModelId = DEFAULT_WAGON_MODEL,
  opts: BuildStarterKitOpts = {}
): StarterKit {
  const includeStarterKit = opts.includeStarterKit ?? true;
  const inventory: Record<string, number> = includeStarterKit
    ? { ...BASE_KIT.inventory }
    : {};
  let cash = BASE_KIT.cash + (includeStarterKit ? 0 : STARTER_KIT_REFUND);
  let oxen = BASE_KIT.oxen;

  // Wagon yokes — required to hitch the full team. Always added,
  // regardless of `includeStarterKit`: without yokes the wagon
  // literally can't move. Spare parts (wheels / axles / planks) are
  // not auto-bundled; player buys at the outfitter.
  const wagon = getWagon(wagonModel);
  inventory.yoke = (inventory.yoke ?? 0) + wagon.requiredYokes;

  // #888c — per-soul outfitter pass. Coats, blankets, and boots
  // scale with partySize. Toggles with `includeStarterKit` (#888b) —
  // veteran players who skip the kit buy these themselves at the
  // outfitter.
  if (includeStarterKit) {
    const partySize = Math.max(1, professions.length);
    inventory.coat    = (inventory.coat    ?? 0) + partySize;
    inventory.blanket = (inventory.blanket ?? 0) + partySize;
    inventory.boots   = (inventory.boots   ?? 0) + partySize;
  }

  for (const id of professions) {
    const prof = getProfession(id);
    for (const entry of prof.starterGear) {
      if (entry.item === 'cash') {
        cash += entry.qty;
      } else if (entry.item === 'ox') {
        oxen += entry.qty;
      } else {
        inventory[entry.item] = (inventory[entry.item] ?? 0) + entry.qty;
      }
    }
  }

  return { cash, oxen, inventory };
}
