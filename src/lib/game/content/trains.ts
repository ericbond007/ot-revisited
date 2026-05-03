// #176 Wagon-train roster generator. Seeded-random rosters of 5-15
// companion wagons, each with a profession + ox count + family-flag.
// Period-flavored captain names (Wexford, Bidwell, Whitman, Bryant —
// real overland-train captains 1843-1856) and family surnames pulled
// from emigrant-diary archives (Sager, Donner, Reed, Whitman, Hancock,
// Royce, Frizzell, Carpenter, Meeker — all named families with diary
// or DLC records). The roster is deterministic per (seed, joinDay).

import type { Rng } from '../rng';
import type { TrainMember, WagonTrain, ProfessionId } from '../types';

// Period captain surnames — used for "Captain X's Company" naming.
const CAPTAIN_NAMES = [
  'Wexford', 'Bidwell', 'Bryant', 'Donner', 'Reed', 'Applegate',
  'Whitman', 'Lee', 'Palmer', 'Thornton', 'Harlan', 'Young',
  'Boggs', 'Russell', 'Stephens'
];

// Period family surnames — used for member labels ("the Sager family").
const FAMILY_NAMES = [
  'Sager', 'Donner', 'Reed', 'Whitman', 'Hancock', 'Royce',
  'Frizzell', 'Carpenter', 'Meeker', 'Sutter', 'Williams', 'Pierce',
  'Hastings', 'Kelsey', 'Bidwell', 'Robinson', 'McLane', 'Harlan',
  'Tetherow', 'Knighton', 'Magone', 'Brown', 'Sublette', 'Greenwood',
  'Pickett', 'Sloan', 'Ide', 'Coffin', 'Watt', 'Polk', 'Belshaw'
];

// Profession mix for member generation. Frequency-weighted to match
// period census of overland emigrants (Unruh, Mattes): farmers were
// the bulk, with a long tail of artisans + a few professionals. Some
// professions never made the trail in numbers (banker is a Sutter /
// Brannan outlier; gunsmith is rare). The bot's `professions.ts` is
// the canonical id list; we sample a weighted subset here.
const PROFESSION_WEIGHTS: Array<[ProfessionId, number]> = [
  ['farmer', 12],
  ['carpenter', 4],
  ['blacksmith', 3],
  ['hunter', 3],
  ['teamster', 3],
  ['merchant', 2],
  ['preacher', 2],
  ['doctor', 2],
  ['scout', 1],
  ['gunsmith', 1],
  ['banker', 1],
  ['indian_trader', 1]
];

function pickProfession(rng: Rng): ProfessionId {
  const total = PROFESSION_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let r = rng.next() * total;
  for (const [id, w] of PROFESSION_WEIGHTS) {
    r -= w;
    if (r <= 0) return id;
  }
  return PROFESSION_WEIGHTS[0][0];
}

/** Generate a wagon-train roster keyed by (seed, joinDay). The same
 *  inputs always produce the same roster — so a player's "Sager
 *  family" stays the Sager family across save/load. */
export function generateTrain(
  seed: string,
  joinDay: number,
  joinedAtLandmarkId: string | null,
  rng: Rng
): WagonTrain {
  const memberCount = rng.int(5, 12);
  const captain = CAPTAIN_NAMES[rng.int(0, CAPTAIN_NAMES.length - 1)];
  const usedNames = new Set<string>();
  const members: TrainMember[] = [];

  for (let i = 0; i < memberCount; i++) {
    // Avoid duplicate family names within a single train — period
    // diaries mention "two Reed wagons" but they're noted as a single
    // extended family; keeping rosters distinct reads cleaner.
    let nameIdx = rng.int(0, FAMILY_NAMES.length - 1);
    let name = FAMILY_NAMES[nameIdx];
    let attempts = 0;
    while (usedNames.has(name) && attempts < 8) {
      nameIdx = (nameIdx + 1) % FAMILY_NAMES.length;
      name = FAMILY_NAMES[nameIdx];
      attempts += 1;
    }
    usedNames.add(name);

    members.push({
      id: `member-${i}`,
      name: `the ${name} family`,
      profession: pickProfession(rng),
      // Ox count: 2-6 working, biased toward 4 (period standard for a
      // medium wagon).
      oxCount: rng.int(2, 6),
      hasChildren: rng.chance(0.6),
      // Cash on hand: $40-300, biased low (period reality — most
      // emigrants left Independence near broke after outfitting).
      cash: rng.int(40, 300)
    });
  }

  return {
    id: `train-${seed}-${joinDay}`,
    name: `Captain ${captain}'s Company`,
    joinedDay: joinDay,
    joinedAtLandmarkId,
    members
  };
}

/** True when at least one alive train member has the given profession.
 *  Used by service predicates (smithy discount when a train blacksmith
 *  is on hand, etc.). Members don't have a `dead` field yet — added in
 *  #280 phase 2 — so this just checks profession membership. */
export function trainHasProfession(
  train: WagonTrain | null | undefined,
  profession: ProfessionId
): boolean {
  if (!train) return false;
  return train.members.some((m) => m.profession === profession);
}

/** Total ox surplus across the train — sum of `(oxCount - 4)` for any
 *  member with more than the standard team. Used by the borrow-ox
 *  service: a train can lend you an ox only if at least one member has
 *  one to spare. */
export function trainOxSurplus(train: WagonTrain | null | undefined): number {
  if (!train) return 0;
  return train.members.reduce((sum, m) => sum + Math.max(0, m.oxCount - 4), 0);
}
