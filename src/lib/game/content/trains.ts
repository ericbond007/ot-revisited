// #176 Wagon-train roster generator. Seeded-random rosters of 5-12
// fully-stateful NPC companion wagons. Each carries party / inventory
// / oxen / morale / cash / wagon — the same shape the player carries
// (#280a). Period-flavored captain names (Wexford, Bidwell, Whitman,
// Bryant — real overland-train captains 1843-1856) and family
// surnames pulled from emigrant-diary archives (Sager, Donner, Reed,
// Whitman, Hancock, Royce, Frizzell, Carpenter, Meeker — all named
// families with diary or DLC records). Roster deterministic per
// (seed, joinDay).

import type { Rng } from '../rng';
import type {
  NpcWagonState,
  Ox,
  PartyMember,
  ProfessionId,
  WagonTrain
} from '../types';
import { DEFAULT_WAGON_MODEL, getWagon } from './wagons';

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

// Period given names — used for individual members within a wagon's
// party. Mixed-sex pool; `pickGivenName` filters by sex.
const FIRST_NAMES_M = [
  'John', 'James', 'William', 'Thomas', 'Joseph', 'Henry', 'Samuel',
  'Charles', 'Daniel', 'George', 'Ezra', 'Jacob', 'Abraham', 'Levi',
  'Caleb', 'Isaac', 'Benjamin', 'Nathaniel', 'Tobias'
];
const FIRST_NAMES_F = [
  'Mary', 'Sarah', 'Elizabeth', 'Martha', 'Hannah', 'Catherine',
  'Margaret', 'Lavinia', 'Helen', 'Ellen', 'Susannah', 'Rebecca',
  'Phoebe', 'Jane', 'Lucy', 'Tamsen', 'Patience', 'Naomi'
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

function pickGivenName(rng: Rng, sex: 'male' | 'female'): string {
  const pool = sex === 'male' ? FIRST_NAMES_M : FIRST_NAMES_F;
  return pool[rng.int(0, pool.length - 1)];
}

/** Generate the party for an NPC wagon: 1 leader + 0-4 dependents.
 *  Dependents include a spouse (likely if `hasChildren`) and 0-3
 *  children. Period reality: most wagons carried family-of-five
 *  averages, with extremes from solo prospectors to 8-person extended
 *  families. */
function generateNpcParty(
  wagonId: string,
  surname: string,
  leaderProf: ProfessionId,
  hasChildren: boolean,
  rng: Rng
): PartyMember[] {
  const party: PartyMember[] = [];
  const leaderSex: 'male' | 'female' = rng.chance(0.85) ? 'male' : 'female';
  const leader: PartyMember = {
    id: `${wagonId}-p0`,
    name: `${pickGivenName(rng, leaderSex)} ${surname}`,
    sex: leaderSex,
    kind: 'adult',
    isLeader: true,
    profession: leaderProf,
    age: rng.int(22, 48),
    health: rng.int(70, 100),
    cleanliness: 100,
    conditions: [],
    dead: false
  };
  party.push(leader);

  // Spouse — present in most family wagons, absent in solo prospectors.
  if (hasChildren || rng.chance(0.7)) {
    const spouseSex = leaderSex === 'male' ? 'female' : 'male';
    party.push({
      id: `${wagonId}-p1`,
      name: `${pickGivenName(rng, spouseSex)} ${surname}`,
      sex: spouseSex,
      kind: 'adult',
      isLeader: false,
      age: rng.int(20, 44),
      health: rng.int(70, 100),
      cleanliness: 100,
      conditions: [],
      dead: false
    });
  }

  // Children — 0-3 if `hasChildren`, otherwise none.
  if (hasChildren) {
    const childCount = rng.int(1, 3);
    for (let c = 0; c < childCount; c++) {
      const childSex: 'male' | 'female' = rng.chance(0.5) ? 'male' : 'female';
      party.push({
        id: `${wagonId}-c${c}`,
        name: `${pickGivenName(rng, childSex)} ${surname}`,
        sex: childSex,
        kind: 'child',
        isLeader: false,
        age: rng.int(2, 14),
        health: rng.int(75, 100),
        cleanliness: 100,
        conditions: [],
        dead: false
      });
    }
  }

  return party;
}

/** Lightweight inventory generator for an NPC wagon. Period-believable
 *  starter manifest — staples + a token of the leader's profession
 *  speciality. NOT the full starter-kit complexity (#52); just enough
 *  to read truthfully and survive the daily-consumption tick. Phase 2
 *  (#280b) will refine. */
function generateNpcInventory(
  leaderProf: ProfessionId,
  partySize: number,
  rng: Rng
): Record<string, number> {
  const inv: Record<string, number> = {
    flour: 100 + rng.int(0, 100),
    bacon: 30 + rng.int(0, 30),
    beans: 20 + rng.int(0, 30),
    coffee: 5 + rng.int(0, 10),
    salt: 3,
    sugar: rng.int(2, 6),
    rifle: 1,
    gunpowder: 10 + rng.int(0, 10),
    lead_balls: 10 + rng.int(0, 15),
    percussion_caps: 10 + rng.int(0, 15),
    coat: partySize,
    blanket: partySize,
    boots: partySize,
    rope: 1,
    shovel: 1,
    cookware: 1,
    bandages: 2 + rng.int(0, 2)
  };
  // Profession sprinkles — speciality items their head-of-wagon
  // brought along. Not full kits, just signature items.
  if (leaderProf === 'doctor') {
    inv.quinine = 2 + rng.int(0, 2);
    inv.laudanum = 4;
    inv.bandages = (inv.bandages ?? 0) + 4;
  } else if (leaderProf === 'blacksmith') {
    inv.iron_toolkit = 1;
    inv.ox_shoes = 8;
  } else if (leaderProf === 'hunter') {
    inv.gunpowder = (inv.gunpowder ?? 0) + 20;
    inv.lead_balls = (inv.lead_balls ?? 0) + 20;
  } else if (leaderProf === 'preacher') {
    inv.bible = 1;
  } else if (leaderProf === 'merchant' || leaderProf === 'indian_trader') {
    inv.beads = 5;
    inv.calico = 2;
  } else if (leaderProf === 'teamster') {
    inv.yoke = 2;
    inv.ox_bow = 4;
  }
  return inv;
}

/** Generate the ox team for an NPC wagon. 2-6 oxen, all alive at
 *  generation time with light fatigue (joining the train mid-trail
 *  means they've already been pulling). */
function generateNpcOxen(wagonId: string, count: number, rng: Rng): Ox[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${wagonId}-ox-${i}`,
    health: rng.int(70, 100),
    fatigue: rng.int(10, 40),
    shod: rng.chance(0.85)
  }));
}

/** Generate one NPC wagon — the full state, not a flat record. */
function generateNpcWagon(
  trainSeed: string,
  index: number,
  surname: string,
  leaderProf: ProfessionId,
  hasChildren: boolean,
  rng: Rng
): NpcWagonState {
  const wagonId = `wagon-${index}`;
  const party = generateNpcParty(wagonId, surname, leaderProf, hasChildren, rng);
  const oxenCount = rng.int(2, 6);
  const wagonModel = getWagon(DEFAULT_WAGON_MODEL);
  return {
    id: wagonId,
    name: `the ${surname} family`,
    leaderProfession: leaderProf,
    hasChildren,
    seed: `${trainSeed}-${wagonId}`,
    party,
    inventory: generateNpcInventory(leaderProf, party.length, rng),
    oxen: generateNpcOxen(wagonId, oxenCount, rng),
    morale: rng.int(60, 90),
    cash: rng.int(40, 300),
    wagon: {
      model: DEFAULT_WAGON_MODEL,
      condition: rng.int(70, 100),
      canvas: rng.int(80, 100),
      carryCapacity: wagonModel.carryCapacity,
      hasBranBarrel: wagonModel.shipsWithBranBarrel === true
    },
    eventLog: [],
    outcome: 'in-progress'
  };
}

/** Generate a wagon-train roster keyed by (seed, joinDay). The same
 *  inputs always produce the same roster — so a player's "Sager
 *  family" stays the Sager family across save/load. Player joins as
 *  the default leader (#285 voting can flip this later). */
export function generateTrain(
  seed: string,
  joinDay: number,
  joinedAtLandmarkId: string | null,
  rng: Rng
): WagonTrain {
  const memberCount = rng.int(5, 12);
  const captain = CAPTAIN_NAMES[rng.int(0, CAPTAIN_NAMES.length - 1)];
  const usedNames = new Set<string>();
  const companions: NpcWagonState[] = [];
  const trainSeed = `${seed}-d${joinDay}`;

  for (let i = 0; i < memberCount; i++) {
    let nameIdx = rng.int(0, FAMILY_NAMES.length - 1);
    let surname = FAMILY_NAMES[nameIdx];
    let attempts = 0;
    while (usedNames.has(surname) && attempts < 8) {
      nameIdx = (nameIdx + 1) % FAMILY_NAMES.length;
      surname = FAMILY_NAMES[nameIdx];
      attempts += 1;
    }
    usedNames.add(surname);

    companions.push(generateNpcWagon(
      trainSeed,
      i,
      surname,
      pickProfession(rng),
      rng.chance(0.6),
      rng
    ));
  }

  return {
    id: `train-${seed}-${joinDay}`,
    name: `Captain ${captain}'s Company`,
    joinedDay: joinDay,
    joinedAtLandmarkId,
    leaderId: 'player',
    companions
  };
}

/** True when at least one companion wagon is led by the given
 *  profession. Used by service predicates (smithy discount when a
 *  train blacksmith is on hand, etc.). */
export function trainHasProfession(
  train: WagonTrain | null | undefined,
  profession: ProfessionId
): boolean {
  if (!train) return false;
  return train.companions.some((c) => c.leaderProfession === profession);
}

/** Live ox count for a single wagon. */
export function wagonOxCount(w: { oxen: Ox[] }): number {
  return w.oxen.filter((o) => o.health > 0).length;
}

/** Total ox surplus across the train — sum of `(aliveOxen - 4)` for
 *  any companion with more than the standard team. Used by the
 *  borrow-ox service: a train can lend you an ox only if at least one
 *  member has one to spare. */
export function trainOxSurplus(train: WagonTrain | null | undefined): number {
  if (!train) return 0;
  return train.companions.reduce(
    (sum, c) => sum + Math.max(0, wagonOxCount(c) - 4),
    0
  );
}
