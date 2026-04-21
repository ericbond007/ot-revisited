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
    bonusSummary: 'Starts with extra cash. −10% buy / +10% sell at posts. Halves cash loss from theft events.',
    starterGear: [{ item: 'cash', qty: 800 }]
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    bonusSummary: '−5% food consumed/day. Auto-forages at rest/camp.',
    starterGear: [{ item: 'flour', qty: 100 }]
  },
  carpenter: {
    id: 'carpenter',
    name: 'Carpenter',
    bonusSummary: 'Wagon repairs faster and use fewer spare parts.',
    starterGear: [
      { item: 'axle', qty: 2 },
      { item: 'wheel', qty: 2 }
    ]
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    bonusSummary: 'Lower disease onset, faster recovery. Safe buffalo-liver prep. Unlocks water boiling pre-1854.',
    starterGear: [
      { item: 'quinine', qty: 2 },
      { item: 'laudanum', qty: 4 },
      { item: 'bandages', qty: 4 }
    ]
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    bonusSummary: 'Quality re-shoeing (2× duration). Salvages iron scrap from broken metal items.',
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
      { item: 'bullets', qty: 30 }
    ]
  },
  teamster: {
    id: 'teamster',
    name: 'Teamster',
    bonusSummary: 'Oxen fatigue slower. Can re-shoe without a Blacksmith.',
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
    bonusSummary: '+15% morale floor. +1 morale per rest night. Earns $5–15 per trading-post stop. Picks up trail rumors.',
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
    bonusSummary: 'Reveals landmarks further ahead. Better river-ford outcomes. Weather prediction 1-2 days out.',
    starterGear: [
      { item: 'compass', qty: 1 },
      { item: 'water_skin', qty: 2 },
      { item: 'spyglass', qty: 1 }
    ]
  },
  preacher: {
    id: 'preacher',
    name: 'Preacher',
    bonusSummary: 'Reduces death morale hit. Camp service fires every camp. Converts bad events to minor morale gains.',
    starterGear: [
      { item: 'bible', qty: 1 },
      { item: 'shovel', qty: 1 },
      { item: 'herbal_poultice', qty: 10 }
    ]
  },
  indian_trader: {
    id: 'indian_trader',
    name: 'Indian Trader',
    bonusSummary: 'Native encounters become tradeable. Unlocks Native trade menu at select posts.',
    starterGear: [
      { item: 'beads', qty: 30 },
      { item: 'pemmican', qty: 2 }
    ]
  },
  gunsmith: {
    id: 'gunsmith',
    name: 'Gunsmith',
    bonusSummary: "Rifles don't fail in wet weather. +20% to Hunter's yield. Better outcomes in defense events.",
    starterGear: [
      { item: 'rifle_cleaning_kit', qty: 1 },
      { item: 'bullets', qty: 15 },
      { item: 'rifle', qty: 1 }
    ]
  }
};

export function getProfession(id: ProfessionId): ProfessionMeta {
  const p = PROFESSIONS[id];
  if (!p) throw new Error(`Unknown profession: ${id}`);
  return p;
}
