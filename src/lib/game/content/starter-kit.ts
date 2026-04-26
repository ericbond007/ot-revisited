import type { ProfessionId } from '../types';
import { getProfession } from './professions';
import { DEFAULT_WAGON_MODEL, getWagon, type WagonModelId } from './wagons';

export interface StarterKit {
  cash: number;
  oxen: number;
  inventory: Record<string, number>;
}

export const BASE_KIT: StarterKit = {
  cash: 300,
  oxen: 4,
  inventory: {
    flour: 500,
    bullets: 20,
    shovel: 1,
    water_skin: 2
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

  // Wagon-model bonuses: enough yokes to hitch the full team, plus
  // any extra starter spares the model wants (e.g. heavy wagons get
  // a spare wheel + planks).
  const wagon = getWagon(wagonModel);
  inventory.yoke = (inventory.yoke ?? 0) + wagon.requiredYokes;
  if (wagon.starterSpares) {
    for (const [id, qty] of Object.entries(wagon.starterSpares)) {
      inventory[id] = (inventory[id] ?? 0) + qty;
    }
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
