import type { ProfessionId } from '../types';
import { getProfession } from './professions';

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
    yoke: 1,
    water_skin: 2
  }
};

export function buildStarterKit(professions: ProfessionId[]): StarterKit {
  const inventory: Record<string, number> = { ...BASE_KIT.inventory };
  let cash = BASE_KIT.cash;
  let oxen = BASE_KIT.oxen;

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
