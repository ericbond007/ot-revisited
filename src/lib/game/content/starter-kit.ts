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
  // #963b1 — starter oxen 4 → 6. Historical norm for a 4-soul party
  // was 4 working + 2 spare (Marcy 1859: "an extra yoke for emergency
  // replacement should be considered indispensable on long crossings").
  // The old 4-ox kit = exactly minTeam for the medium wagon = NO
  // SPARE. Bot personas already target a 6-ox team via thinThreshold=2,
  // so the bot was chasing the missing buffer at Laramie (burning cash
  // that should have stayed for late-trail food + repairs). Wealthy
  // emigrants brought 8-10; this is a conservative middle ground.
  oxen: 6,
  inventory: {
    // #963 — starter food provisions calibrated against Palmer 1845
    // (the canonical emigrant guidebook). Old kit was 380 lb total
    // food — about 24% of Palmer's per-adult × 4-soul recommendation
    // and barely 50 days of normal rations. Bots ran out of food and
    // cash mid-Snake every run. The new kit lands at ~905 lb staples,
    // ~60% Palmer scaled for a typical 4-adult party + matching the
    // medium wagon's 2,500 lb capacity (still ~45% loaded after kit
    // + clothing + yokes — leaves room for hunts, water, spare parts).
    //
    // Palmer 1845 per adult: 200 lb flour, 75 lb bacon, 30 lb beans,
    // 30 lb hardtack, 60 lb dried fruit, 25 lb sugar, 10 lb coffee
    // (≈400 lb total). We scale that to a 4-soul family at ~60% so
    // post resupply remains a real strategic choice, not optional.
    flour:     600,
    beans:      80,
    bacon:     100,
    hardtack:   50,
    dried_fruit: 40,
    sugar:      25,
    coffee:      4,
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
 *  contents at Independence prices for a 4-soul reference family.
 *
 *  #963 recalibration: post-food-bump kit costs ~$390 at Independence
 *  prices (food $225 + medicine $80 + rifle/ammo $40 + tent/rope $20
 *  + per-soul clothing $25).
 *
 *  #963b1: starter oxen 4 → 6 adds ~$60 of kit value (Independence ox
 *  was ~$25-30/head, 2 extra = $50-60). Refund bumped 440 → 500 so the
 *  skip-the-kit path still covers buy-back at the outfitter. */
const STARTER_KIT_REFUND = 500;

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
