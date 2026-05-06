import type { ProfessionId } from '../types';
import { getProfession } from './professions';
import { DEFAULT_WAGON_MODEL, getWagon, type WagonModelId } from './wagons';

export interface StarterKit {
  cash: number;
  oxen: number;
  inventory: Record<string, number>;
}

// Audited starter kit (#102 follow-up):
//   - Variety in BASE so the varied-diet bonus (#110) is reachable
//     without buying anything: 300 flour + 50 beans + 30 bacon spans
//     the starch + meat groups.
//   - Cookware, salt, bandages, coffee in BASE so the brew-water,
//     cure-meat, and triage-injury paths all work day 1 regardless
//     of party composition.
//   - Bullets removed from BASE: useless without a rifle, so leaving
//     them in the kit wasted weight when the party had no Hunter or
//     Gunsmith. Either of those professions brings their own bullets.
//   - Water skins removed from BASE: each wagon model already
//     declares its own baseWaterCapGal (15 / 20 / 25) representing
//     the wagon's built-in keg. Water skins are an outfitter upgrade
//     for dry stretches, not a baseline assumption.
//   - Wagon spare-parts no longer pre-loaded — players who want
//     wheels / axles / planks buy them at the outfitter, on their
//     own weight budget.
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
    // profession layers a full professional supply on top.
    quinine:     4,
    calomel:     2,
    laudanum:    2,
    paregoric:   2,
    bandages:    8,
    shovel:      1,
    cookware:    1
    // Yokes are added per-wagon by buildStarterKit — each wagon
    // model needs a different count to hitch its full team (#107).
  }
};

export function buildStarterKit(
  professions: ProfessionId[],
  wagonModel: WagonModelId = DEFAULT_WAGON_MODEL
): StarterKit {
  const inventory: Record<string, number> = { ...BASE_KIT.inventory };
  let cash = BASE_KIT.cash;
  let oxen = BASE_KIT.oxen;

  // Wagon model adds enough yokes to hitch the full team. Spare
  // parts are no longer auto-bundled — players buy what they want
  // at the outfitter so the per-wagon weight budget is honest.
  const wagon = getWagon(wagonModel);
  inventory.yoke = (inventory.yoke ?? 0) + wagon.requiredYokes;

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
