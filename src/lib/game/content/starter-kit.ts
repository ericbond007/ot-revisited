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
  cash: 500,
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
    // #1284 — starter food reshaped to ~87% of Palmer 1845 guidance and
    // corrected for the inverted fat ratio (#963 had 6:1 flour:bacon,
    // period emigrants over-carried fat — Ware 1849 spec'd MORE bacon
    // than flour; the 1849 jettison-pile lists are famously full of
    // "piles of most beautiful bacon" but never flour).
    //
    // Research appendix: docs/superpowers/specs/2026-06-10-food-economy-research.md
    // Key finding: the inverted-fat-ratio is the most period-unfaithful
    // aspect of the old kit; fixing it also changes the late-trail
    // failure mode from "out of flour" to "out of the dense calorie
    // reserve," which is historically correct.
    //
    // New kit (4-soul scale, lb):
    //   flour     700  175/adult (Palmer 200 per adult)
    //   bacon     320   80/adult — fixes the inverted fat ratio
    //   cornmeal   80  grain variety (diet groups), period-cheap
    //   beans     110
    //   hardtack   80
    //   dried_fruit 70  scurvy-aware guides pushed this
    //   sugar      60
    //   coffee     10  waterborne-0.6× + morale payload
    //   salt       12  enables curing a full ox (§3 #1284) + hunts (#122)
    //   ──────────────
    //   total   1,442 lb staples (~67% of medium-wagon 2,500 lb capacity
    //           after full kit — safely under 75% overload threshold)
    //
    // Cash bumped 400 → 500 (#1284): outfit budget stays honest — full
    // Palmer was rejected partly because it broke the bankroll. After
    // buying the outfit a family typically left Independence with $50–150
    // in hand; the $500 baseline preserves that feel with the richer kit.
    flour:      700,
    bacon:      320,
    cornmeal:    80,
    beans:      110,
    hardtack:    80,
    dried_fruit: 70,
    sugar:       60,
    coffee:      10,
    salt:        12,
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
   *  the player gets +$650 cash (BASE_KIT outfitter-replacement value,
   *  #1284 recalibrated) on top of the $500 baseline so they can
   *  re-buy what they need. Total: $1,150 cash, no flour, no medicine,
   *  no rifle, no clothing, no tent. Player provisions from scratch at
   *  the Independence outfitter. */
  includeStarterKit?: boolean;
}

/** #888b — outfitter-equivalent cash refund when player skips the
 *  starter kit. Calibrated against the cost of buying the BASE_KIT
 *  contents at Independence prices for a 4-soul reference family.
 *
 *  #1284 recalibration: post-#1284 guide-shaped kit costs ~$537 at
 *  Independence prices:
 *    food      $399.50  (flour $140 + bacon $128 + cornmeal $8 +
 *                        beans $27.50 + hardtack $12 + dried_fruit $42
 *                        + sugar $21 + coffee $3 + salt $18)
 *    medicine   $34.20  (quinine + calomel + laudanum + paregoric +
 *                        bandages + saleratus)
 *    rifle/ammo $22.10  (rifle $20 + ammo $2.10)
 *    equipment  $21.00  (tent + rope + shovel + cookware)
 *    clothing   $48.00  (coat + boots + blanket × 4 souls)
 *    yokes      $12.00  (2 × $6 for prairie schooner)
 *
 *  Oxen (6): ~$25-30/head; 2 extra above min-team ≈ $50-60.
 *  Total replacement ≈ $597. Rounded up to $650 so the skip-the-kit
 *  path still fully covers buy-back at the outfitter. */
const STARTER_KIT_REFUND = 650;

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
