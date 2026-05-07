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
  /** #285 — leadership charisma 0-5. Drives weighted election rolls
   *  for wagon-train captaincy. Period anchor: the most-elected
   *  captains in the diary record were preachers (Jason Lee at the
   *  Methodist Mission), bankers / merchants (William Russell, Sam
   *  Brannan — wealth + literacy = authority), and scouts (Joe Meek,
   *  Kit Carson — "the man who knows the trail"). Most working
   *  laborers and farmers ranked low not because they were less
   *  capable but because the company didn't think to elect them.
   *  Default 1; preacher 5, banker / scout 4, merchant / doctor 3,
   *  most others 2, whore 1 (but eligible — period reality: Eleanor
   *  Dumont was a respected camp figure even when reviled). */
  charisma?: number;
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
    starterGear: [{ item: 'cash', qty: 1000 }],
    charisma: 4
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    bonusSummary: '−10% food consumed/day. Forages 4 lb berries per rest day Apr–Sep.',
    starterGear: [{ item: 'flour', qty: 100 }],
    charisma: 1
  },
  carpenter: {
    id: 'carpenter',
    name: 'Carpenter',
    bonusSummary: '50% chance to save the spare part during wagon repairs.',
    starterGear: [
      { item: 'axle', qty: 2 },
      { item: 'wheel', qty: 2 }
    ],
    charisma: 2
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    bonusSummary: 'Conditions deal 30% less daily damage. Unlocks water boiling pre-1854.',
    // #275 v10 — period-realistic doctor's chest, layered on top of the
    // BASE_KIT family chest. Marcy 1859 spec for a working medical
    // practitioner on the trail: roughly 2× the family allotment of
    // each major drug. Total chest with BASE: 12 quinine, 8 calomel,
    // 6 laudanum, 6 paregoric, 4 Dover's powder, 14 bandages.
    starterGear: [
      { item: 'quinine', qty: 8 },
      { item: 'calomel', qty: 6 },
      { item: 'laudanum', qty: 4 },
      { item: 'paregoric', qty: 4 },
      { item: 'dovers_powder', qty: 4 },
      { item: 'bandages', qty: 6 }
    ],
    charisma: 3
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    bonusSummary: 'Town smithy repairs cost half — your Blacksmith does the work, the post charges for materials only.',
    starterGear: [
      { item: 'iron_toolkit', qty: 1 },
      { item: 'ox_shoes', qty: 10 }
    ],
    charisma: 2
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
    ],
    charisma: 2
  },
  teamster: {
    id: 'teamster',
    name: 'Teamster',
    bonusSummary: 'Oxen tire 15% slower on the road and recover 20% faster on rest days.',
    starterGear: [
      { item: 'ox', qty: 1 },
      { item: 'yoke', qty: 1 },
      { item: 'ox_shoes', qty: 4 }
    ],
    charisma: 2
  },
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    bonusSummary: '−15% buy / +20% sell at posts.',
    starterGear: [
      { item: 'tobacco', qty: 20 },
      { item: 'beads', qty: 30 }
    ],
    charisma: 3
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
    ],
    charisma: 1
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    bonusSummary: '+8% travel speed — knows the country and finds shortcuts.',
    starterGear: [
      { item: 'compass', qty: 1 },
      { item: 'water_skin', qty: 2 },
      { item: 'spyglass', qty: 1 }
    ],
    charisma: 4
  },
  preacher: {
    id: 'preacher',
    name: 'Preacher',
    bonusSummary: 'Halves death-event morale hits. Adds bonuses to bible-reading + sing-along camp actions.',
    starterGear: [
      { item: 'bible', qty: 1 },
      { item: 'herbal_poultice', qty: 10 }
    ],
    charisma: 5
  },
  indian_trader: {
    id: 'indian_trader',
    name: 'Indian Trader',
    bonusSummary: '+50% pemmican on native trade encounters; +2 extra relations per favorable trade.',
    starterGear: [
      { item: 'beads', qty: 30 },
      { item: 'pemmican', qty: 2 }
    ],
    charisma: 3
  },
  gunsmith: {
    id: 'gunsmith',
    name: 'Gunsmith',
    // #317 — period-correct rework. Old "+20% hunt yield" was placeholder
    // hunter-overlap. Gunsmith now: better lead-casting (50 balls/pig vs
    // amateur 30, no bullet_mold needed — the gunsmith IS the mold) +
    // a second starter rifle (parallel hunters from day 1, since a
    // working gunsmith naturally had spare arms).
    bonusSummary: "Casts 50 balls per lead pig (vs 30); no bullet mold needed. Starts with 2 rifles.",
    starterGear: [
      { item: 'rifle_cleaning_kit', qty: 1 },
      { item: 'bullet_mold', qty: 1 },
      { item: 'gunpowder', qty: 15 },
      { item: 'lead_balls', qty: 15 },
      { item: 'percussion_caps', qty: 15 },
      { item: 'rifle', qty: 2 }
    ],
    charisma: 2
  },
  teacher: {
    id: 'teacher',
    name: 'Teacher',
    // #317 — period-correct schoolteacher. Tabitha Brown founded
    // Pacific University out of an 1846 trail wagon at age 66; John
    // Bidwell was a Missouri schoolteacher before the 1841 crossing.
    // Mechanic: a primer (McGuffey's Reader was THE 1840s schoolbook)
    // in inventory restores +1 morale/day from the teacher reading
    // aloud at camp; camp action "Teach the kids" gives a party-wide
    // morale bump when children are present.
    bonusSummary: 'Primer in inventory restores +1 morale/day. Adds "Teach the kids" camp action (+5 party morale).',
    starterGear: [
      { item: 'primer', qty: 1 },
      { item: 'bible', qty: 1 }
    ],
    charisma: 3
  },
  lawyer: {
    id: 'lawyer',
    name: 'Lawyer',
    // #317 — period-correct frontier attorney. Lansford Hastings was
    // an Ohio lawyer + land speculator who promoted the Hastings Cutoff
    // (and indirectly killed the Donner Party); James Reed was a
    // wealthy Springfield businessman + land speculator with similar
    // litigious instincts. Mechanic: tied-charisma elections favor
    // the lawyer (#285), and tolls / ferry fees drop 20% (the lawyer
    // argues the receipt down). Land claim arrival bonus represents
    // the legal infrastructure to file a Donation Land Claim.
    bonusSummary: 'Wins tied charisma votes; reduces party-conflict events. −20% post tolls + ferry fees. +$200 arrival bonus.',
    starterGear: [
      { item: 'cash', qty: 200 },
      { item: 'bible', qty: 1 }
    ],
    charisma: 4
  }
};

/** #285 — convenience helper. Default 1 when a profession doesn't
 *  declare charisma (defensive — keeps elections sensible if a new
 *  profession is added without a value). */
export function professionCharisma(id: ProfessionId): number {
  return PROFESSIONS[id]?.charisma ?? 1;
}

export function getProfession(id: ProfessionId): ProfessionMeta {
  const p = PROFESSIONS[id];
  if (!p) throw new Error(`Unknown profession: ${id}`);
  return p;
}
