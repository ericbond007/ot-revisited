// Per-tribe data for Indian-relations mechanics. Each tribe has a
// region along the trail (mile range), a baseline attitude (0-100), a
// short blurb, and the trade goods they favor. Runtime attitude starts
// at baseline and shifts via events — stored on state.flags.
//
// Baseline calibration (1848 starting point):
//   80+  allied       very helpful, excellent trade rates
//   61-80 friendly    will trade, may give small gifts
//   41-60 neutral     cautious trade, no gifts
//   21-40 wary        will trade for high-value goods only, may demand toll
//   0-20  hostile     no trade, likely to attack
//
// Regions use `milesTraveled` along the trail as the axis — roughly
// lines up with the historical geography. Overlaps are intentional
// (Cheyenne + Sioux, Cayuse + Umatilla) and encounters can roll
// against either tribe in the overlap.

export interface Tribe {
  id: string;
  name: string;
  /** Mile range along the trail where encounters with this tribe fire. */
  region: { fromMile: number; toMile: number };
  baselineAttitude: number;
  /** Items they'll accept in trade, ordered by preference. */
  preferredTrade: readonly string[];
  blurb: string;
}

export type AttitudeLevel = 'hostile' | 'wary' | 'neutral' | 'friendly' | 'allied';

export function attitudeLevel(score: number): AttitudeLevel {
  if (score >= 81) return 'allied';
  if (score >= 61) return 'friendly';
  if (score >= 41) return 'neutral';
  if (score >= 21) return 'wary';
  return 'hostile';
}

export const TRIBES: readonly Tribe[] = [
  {
    id: 'pawnee',
    name: 'Pawnee',
    region: { fromMile: 100, toMile: 280 },
    baselineAttitude: 55,
    preferredTrade: ['tobacco', 'beads', 'bullets'],
    blurb: 'Horticulturists of the central Platte valley. Generally friendly to emigrants but often raided by Sioux — sometimes ask for tolls in tobacco or bullets.'
  },
  {
    id: 'sioux',
    name: 'Sioux',
    region: { fromMile: 250, toMile: 650 },
    baselineAttitude: 45,
    preferredTrade: ['tobacco', 'whiskey', 'bullets', 'beads'],
    blurb: 'Lakota bands of the North Platte and Laramie plains. Powerful and increasingly cautious of the emigrant stream — traders who pay respect pass easily; those who do not, may not.'
  },
  {
    id: 'cheyenne',
    name: 'Cheyenne',
    region: { fromMile: 400, toMile: 700 },
    baselineAttitude: 50,
    preferredTrade: ['tobacco', 'beads', 'buffalo_robe'],
    blurb: 'Horse people of the high plains west of Laramie. Skilled traders, known for fine buffalo robes. Wary of wagon trains but rarely hostile in the early years.'
  },
  {
    id: 'shoshone',
    name: 'Shoshone',
    region: { fromMile: 800, toMile: 1200 },
    baselineAttitude: 65,
    preferredTrade: ['beads', 'tobacco', 'blanket'],
    blurb: "Mountain Shoshone of the Green River and Bear River country. Chief Washakie's people have been friendly to whites since Sacagawea guided Lewis & Clark — trade is easy here."
  },
  {
    id: 'bannock',
    name: 'Bannock',
    region: { fromMile: 1100, toMile: 1400 },
    baselineAttitude: 45,
    preferredTrade: ['tobacco', 'beads'],
    blurb: "Shoshone-speaking bands of the Snake River plain. Neighbors and sometime-rivals of the main Shoshone. Will trade if approached with proper courtesy."
  },
  {
    id: 'nez_perce',
    name: 'Nez Perce',
    region: { fromMile: 1400, toMile: 1700 },
    baselineAttitude: 70,
    preferredTrade: ['beads', 'tobacco', 'blanket', 'rifle'],
    blurb: 'Long-time friends of the white man since Lewis & Clark. Famed horsemen and fair traders — many emigrants remember the Nez Perce as the reason they survived the mountains.'
  },
  {
    id: 'cayuse',
    name: 'Cayuse',
    region: { fromMile: 1700, toMile: 1900 },
    baselineAttitude: 35,
    preferredTrade: ['rifle', 'bullets', 'tobacco'],
    blurb: 'Plateau people of the Umatilla country. Since the Whitman Massacre of 1847 they have been at war with the Americans — trade is tense, sometimes refused outright.'
  },
  {
    id: 'walla_walla',
    name: 'Walla Walla',
    region: { fromMile: 1850, toMile: 2020 },
    baselineAttitude: 45,
    preferredTrade: ['beads', 'tobacco', 'blanket'],
    blurb: 'Columbia Plateau people of the lower Walla Walla. Good traders connected to the HBC network — cautious of wagon trains since the Cayuse war spread north.'
  },
  {
    id: 'umatilla',
    name: 'Umatilla',
    region: { fromMile: 1800, toMile: 1950 },
    baselineAttitude: 50,
    preferredTrade: ['beads', 'tobacco', 'blanket'],
    blurb: 'Plateau people of the Umatilla River valley. Less directly impacted by the Whitman affair than the Cayuse — trade remains cautious but viable.'
  }
];

export function getTribe(id: string): Tribe {
  const t = TRIBES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tribe: ${id}`);
  return t;
}

/** Tribes whose region contains the given trail mile. May be 0, 1, or
 *  several (overlapping regions — encounter picker can roll between). */
export function tribesAtMile(miles: number): Tribe[] {
  return TRIBES.filter((t) => miles >= t.region.fromMile && miles <= t.region.toMile);
}
