import type { ProfessionId } from '../types';

export interface StarterGearEntry {
  item: string;
  qty: number;
}

export interface ProfessionMeta {
  id: ProfessionId;
  name: string;
  bonusSummary: string;
  starterGear: StarterGearEntry[];
  femaleOnly?: boolean;
}

export const PROFESSIONS: Record<ProfessionId, ProfessionMeta> = {
  banker: {
    id: 'banker',
    name: 'Banker',
    bonusSummary: 'Starts with $1000. −10% buy / +10% sell at posts.',
    // #276 follow-up — period reality: a banker / wealthy merchant
    // emigrant carried $1500–3000 of personal wealth, vs. the typical
    // $400–700 family outfit budget. With BASE_KIT $400 cash baseline
    // the Banker now totals $1400 starter — period-plausible upper-
    // middle-class wealth. Was $1000 total (BASE $400 + $600).
    starterGear: [{ item: 'cash', qty: 1000 }]
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    bonusSummary: '−10% food consumed/day. Forages 4 lb berries per rest day Apr–Sep.',
    starterGear: [{ item: 'flour', qty: 100 }]
  },
  carpenter: {
    id: 'carpenter',
    name: 'Carpenter',
    bonusSummary: '50% chance to save the spare part during wagon repairs.',
    starterGear: [
      { item: 'axle', qty: 2 },
      { item: 'wheel', qty: 2 }
    ]
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    bonusSummary: 'Conditions deal 30% less daily damage. Unlocks water boiling pre-1854.',
    starterGear: [
      { item: 'quinine', qty: 2 },
      { item: 'laudanum', qty: 4 },
      { item: 'bandages', qty: 4 }
    ]
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    bonusSummary: 'Town smithy repairs cost half — your Blacksmith does the work, the post charges for materials only.',
    starterGear: [
      { item: 'iron_toolkit', qty: 1 },
      { item: 'ox_shoes', qty: 10 }
    ]
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    bonusSummary: '+20% meat per hunt.',
    starterGear: [
      { item: 'rifle', qty: 1 },
      { item: 'bullet_mold', qty: 1 },
      { item: 'gunpowder', qty: 30 },
      { item: 'lead_balls', qty: 30 },
      { item: 'percussion_caps', qty: 30 },
      { item: 'lead_pig', qty: 1 }
    ]
  },
  teamster: {
    id: 'teamster',
    name: 'Teamster',
    bonusSummary: 'Oxen tire 15% slower on the road and recover 20% faster on rest days.',
    starterGear: [
      { item: 'ox', qty: 1 },
      { item: 'yoke', qty: 1 },
      { item: 'ox_shoes', qty: 4 }
    ]
  },
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    bonusSummary: '−15% buy / +20% sell at posts.',
    starterGear: [
      { item: 'tobacco', qty: 20 },
      { item: 'beads', qty: 30 }
    ]
  },
  whore: {
    id: 'whore',
    name: 'Whore',
    bonusSummary: '+15 morale floor. Earns $5–15 per trading-post stop. Unlocks the Share-the-Whore camp action.',
    femaleOnly: true,
    starterGear: [
      { item: 'cash', qty: 100 },
      { item: 'tobacco', qty: 5 },
      { item: 'whiskey', qty: 5 },
      { item: 'tea', qty: 10 }
    ]
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    bonusSummary: '+8% travel speed — knows the country and finds shortcuts.',
    starterGear: [
      { item: 'compass', qty: 1 },
      { item: 'water_skin', qty: 2 },
      { item: 'spyglass', qty: 1 }
    ]
  },
  preacher: {
    id: 'preacher',
    name: 'Preacher',
    bonusSummary: 'Halves death-event morale hits. Adds bonuses to bible-reading + sing-along camp actions.',
    starterGear: [
      { item: 'bible', qty: 1 },
      { item: 'herbal_poultice', qty: 10 }
    ]
  },
  indian_trader: {
    id: 'indian_trader',
    name: 'Indian Trader',
    bonusSummary: '+50% pemmican on native trade encounters; +2 extra relations per favorable trade.',
    starterGear: [
      { item: 'beads', qty: 30 },
      { item: 'pemmican', qty: 2 }
    ]
  },
  gunsmith: {
    id: 'gunsmith',
    name: 'Gunsmith',
    bonusSummary: "+20% on hunt yield (stacks with Hunter).",
    starterGear: [
      { item: 'rifle_cleaning_kit', qty: 1 },
      { item: 'bullet_mold', qty: 1 },
      { item: 'gunpowder', qty: 15 },
      { item: 'lead_balls', qty: 15 },
      { item: 'percussion_caps', qty: 15 },
      { item: 'rifle', qty: 1 }
    ]
  }
};

export function getProfession(id: ProfessionId): ProfessionMeta {
  const p = PROFESSIONS[id];
  if (!p) throw new Error(`Unknown profession: ${id}`);
  return p;
}
