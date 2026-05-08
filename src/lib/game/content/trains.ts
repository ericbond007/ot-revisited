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
import { computeWaterCap } from '../systems/water-cap';
import type { BotProfile } from './bot-profiles';
import { LAUNCH_PROFILES, pickProfilesForRoster } from './bot-profiles';
import { getProfession } from './professions';

// #287a — surnames reserved for named profiles. Random fillers must
// never pick these (would produce a duplicate "the Sager family"
// wagon alongside the historical one). Computed from LAUNCH_PROFILES
// so adding new profiles auto-extends the reservation.
const RESERVED_SURNAMES = new Set(LAUNCH_PROFILES.map((p) => p.surname));

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

/** Wagon composition archetypes — period-realistic mix per Unruh
 *  *Plains Across* + Mattes census. Family wagons were the bulk; the
 *  long tail is groups-of-friends, in-law clusters, and solo
 *  prospectors. Affects party generation: who's in the wagon, how
 *  they're related, whether children are aboard. */
export type WagonComposition = 'family' | 'mixed' | 'all_adult' | 'solo';

// Independence-start weights. Period reality: emigrants assembled
// into companies BEFORE departure — guidebooks (Marcy 1859, Ware
// 1849) emphasized never starting alone. So solos at Independence
// were rare oddballs (Joe-Meek-types, recently-arrived single men).
const COMPOSITION_WEIGHTS_FRESH: Array<[WagonComposition, number]> = [
  ['family', 65],
  ['mixed', 18],
  ['all_adult', 13],
  ['solo', 4]
];

// Mid-trail-join weights. Solo gets significantly more share here:
// the natural mid-trail solo wagon is a *survivor* — leader whose
// family died of cholera or accident, continuing alone. Helen
// Carpenter (1857) and Bryant (1846) both describe these "widow
// wagons" and "orphan wagons" trailing the main companies. Family
// share drops accordingly — the dead families that attrited into
// solos came from somewhere.
const COMPOSITION_WEIGHTS_MIDTRAIL: Array<[WagonComposition, number]> = [
  ['family', 45],
  ['mixed', 17],
  ['all_adult', 18],
  ['solo', 20]
];

function pickComposition(rng: Rng, fresh: boolean): WagonComposition {
  const weights = fresh ? COMPOSITION_WEIGHTS_FRESH : COMPOSITION_WEIGHTS_MIDTRAIL;
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let r = rng.next() * total;
  for (const [id, w] of weights) {
    r -= w;
    if (r <= 0) return id;
  }
  return 'family';
}

/** Generate the party for an NPC wagon based on composition archetype.
 *  Period reality: family wagons (60%) carried 4-6 souls (parents +
 *  kids); mixed wagons (15%) added unrelated adults (in-laws, hired
 *  hands, friends); all-adult wagons (15%) were 2-4 unrelated men
 *  prospecting or freighting together; solo (10%) was the rare
 *  Joe-Meek-style trapper-turned-emigrant. The optional `fresh` flag
 *  gives every member 100 HP — used at Independence-start joins where
 *  no trail wear has accumulated.
 *
 *  #287a — When `profile` is supplied, the random party generation is
 *  skipped and the profile's verbatim member list is used instead.
 *  Named profiles ship the same family every game on the same seed. */
function generateNpcParty(
  wagonId: string,
  surname: string,
  leaderProf: ProfessionId,
  composition: WagonComposition,
  fresh: boolean,
  rng: Rng,
  profile?: BotProfile
): PartyMember[] {
  if (profile) return generatePartyFromProfile(wagonId, profile, fresh, rng);
  const party: PartyMember[] = [];
  const leaderSex: 'male' | 'female' = rng.chance(0.85) ? 'male' : 'female';
  const adultHp = (): number => fresh ? 100 : rng.int(70, 100);
  const childHp = (): number => fresh ? 100 : rng.int(75, 100);

  const leader: PartyMember = {
    id: `${wagonId}-p0`,
    name: `${pickGivenName(rng, leaderSex)} ${surname}`,
    sex: leaderSex,
    kind: 'adult',
    isLeader: true,
    profession: leaderProf,
    age: rng.int(22, 48),
    health: adultHp(),
    cleanliness: 100,
    conditions: [],
    dead: false
  };
  party.push(leader);

  if (composition === 'solo') return party;

  // Spouse — present in family + mixed wagons. all_adult skips spouse,
  // adds peers below.
  if (composition === 'family' || composition === 'mixed') {
    const spouseSex = leaderSex === 'male' ? 'female' : 'male';
    party.push({
      id: `${wagonId}-p1`,
      name: `${pickGivenName(rng, spouseSex)} ${surname}`,
      sex: spouseSex,
      kind: 'adult',
      isLeader: false,
      age: rng.int(20, 44),
      health: adultHp(),
      cleanliness: 100,
      conditions: [],
      dead: false
    });
  }

  // Children — only family + mixed wagons; mixed wagons sometimes skip.
  if (composition === 'family' || (composition === 'mixed' && rng.chance(0.6))) {
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
        health: childHp(),
        cleanliness: 100,
        conditions: [],
        dead: false
      });
    }
  }

  // Extra adults — peers, in-laws, hired hands, brothers-in-arms.
  // Mixed wagons get 1-2; all_adult wagons get 1-3 to round out the
  // crew. Surnames may differ from the leader (in-laws, friends) —
  // we mix in 50/50.
  if (composition === 'mixed' || composition === 'all_adult') {
    const extraCount = composition === 'all_adult' ? rng.int(1, 3) : rng.int(1, 2);
    for (let e = 0; e < extraCount; e++) {
      const sex: 'male' | 'female' = rng.chance(0.85) ? 'male' : 'female';
      const extraSurname = rng.chance(0.5)
        ? FAMILY_NAMES[rng.int(0, FAMILY_NAMES.length - 1)]
        : surname;
      party.push({
        id: `${wagonId}-e${e}`,
        name: `${pickGivenName(rng, sex)} ${extraSurname}`,
        sex,
        kind: 'adult',
        isLeader: false,
        age: rng.int(18, 50),
        health: adultHp(),
        cleanliness: 100,
        conditions: [],
        dead: false
      });
    }
  }

  return party;
}

/** #287a — Build the party verbatim from a named profile. The profile
 *  records exact members (sex, age, given name, role) — ages drift by
 *  ±1 year from the dossier base so the same family doesn't appear
 *  identical across seeds, but composition + names are stable. */
function generatePartyFromProfile(
  wagonId: string,
  profile: BotProfile,
  fresh: boolean,
  rng: Rng
): PartyMember[] {
  const adultHp = (): number => fresh ? 100 : rng.int(70, 100);
  const childHp = (): number => fresh ? 100 : rng.int(75, 100);
  return profile.party.map((m, i) => {
    const memberSurname = m.surname ?? profile.surname;
    return {
      id: `${wagonId}-${m.role[0]}${i}`,
      name: `${m.given} ${memberSurname}`,
      sex: m.sex,
      kind: m.role === 'child' ? 'child' : 'adult',
      isLeader: m.role === 'leader',
      profession: m.role === 'leader' ? profile.leaderProfession : undefined,
      age: Math.max(0, m.age + rng.int(-1, 1)),
      health: m.role === 'child' ? childHp() : adultHp(),
      cleanliness: 100,
      conditions: [],
      dead: false
    };
  });
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
    // #305 — saleratus starter (1 unit = 0.5 lb pack, ~35 days for a
    // small family). Without it the wagon takes a daily morale debit
    // when flour/cornmeal eaten. Refills at trading posts.
    saleratus: 1,
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

/** Generate the ox team for an NPC wagon. 2-6 oxen. `fresh=true`
 *  gives full health and zero fatigue (Independence-start joins);
 *  `fresh=false` is the trail-fatigued team for mid-trail joins. */
function generateNpcOxen(
  wagonId: string,
  count: number,
  fresh: boolean,
  rng: Rng
): Ox[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${wagonId}-ox-${i}`,
    health: fresh ? 100 : rng.int(70, 100),
    fatigue: fresh ? 0 : rng.int(10, 40),
    shod: fresh ? true : rng.chance(0.85)
  }));
}

/** Composition-aware label for an NPC wagon — "the Sager family,"
 *  "the Reed brothers," "Joe Meek." Reads naturally in the roster
 *  panel and event log. */
function wagonLabel(surname: string, composition: WagonComposition, party: PartyMember[]): string {
  if (composition === 'solo') {
    const leader = party[0];
    return leader.name;
  }
  if (composition === 'all_adult') {
    return `the ${surname} party`;
  }
  // family + mixed both read as "the X family"
  return `the ${surname} family`;
}

export interface GenerateNpcWagonOpts {
  /** `true` for Independence-start joins → full health, fresh oxen,
   *  pristine wagon condition. `false` for mid-trail joins → light
   *  trail wear (the train has been moving). */
  fresh?: boolean;
  /** #287a — supply a named profile to override random surname /
   *  profession / composition / party. Same profile + same seed
   *  always produces the same family. */
  profile?: BotProfile;
}

/** Generate one NPC wagon — the full state, not a flat record.
 *  #287a — when `opts.profile` is supplied the wagon ships with a
 *  named profile (Sagers, Donners, Reeds, Joe Meek, etc.); the
 *  profile's surname / leader profession / composition / party
 *  override the random rolls. */
function generateNpcWagon(
  trainSeed: string,
  index: number,
  surname: string,
  leaderProf: ProfessionId,
  composition: WagonComposition,
  rng: Rng,
  opts: GenerateNpcWagonOpts = {}
): NpcWagonState {
  const wagonId = `wagon-${index}`;
  const fresh = opts.fresh === true;
  const profile = opts.profile;
  const party = generateNpcParty(wagonId, surname, leaderProf, composition, fresh, rng, profile);
  const oxenCount = rng.int(2, 6);
  const wagonModel = getWagon(DEFAULT_WAGON_MODEL);
  const hasChildren = party.some((p) => p.kind === 'child');
  // #888a — profile owns Layer 0 of the kit. When `profile.kit` is
  // set, it's the COMPLETE family inventory (no random base). When
  // unset, fall through to the random `generateNpcInventory` for
  // anonymous / random-filler wagons. Profession.starterGear layers
  // additively on top either way (kept DRY for now per #890 audit).
  // `cash` is a top-level field, extracted separately.
  let inventory: Record<string, number>;
  let cashOverride: number | undefined;
  if (profile?.kit) {
    inventory = {};
    for (const [key, qty] of Object.entries(profile.kit)) {
      if (key === 'cash') cashOverride = qty;
      else inventory[key] = qty;
    }
  } else {
    inventory = generateNpcInventory(leaderProf, party.length, rng);
  }
  // Profession starterGear additive layer (DRY — same for player +
  // NPC paths). hunter brings bullet_mold + lead_pig regardless of
  // which hunter profile is in play.
  for (const entry of getProfession(leaderProf).starterGear) {
    if (entry.item === 'cash') cashOverride = (cashOverride ?? 0) + entry.qty;
    else if (entry.item === 'ox') {} // ox count handled separately
    else inventory[entry.item] = (inventory[entry.item] ?? 0) + entry.qty;
  }
  // #303e — water tracking. Cap from wagon model + any starter water_skin
  // (none today, but kept symmetric with the player's computeWaterCap so
  // when NPCs gain trade access the cap follows). Fresh joins start at
  // full keg; mid-trail joins start at 60-100% to reflect light wear.
  const waterCap = computeWaterCap(DEFAULT_WAGON_MODEL, inventory);
  const water = fresh ? waterCap : Math.round(waterCap * (0.6 + rng.int(0, 40) / 100));
  return {
    id: wagonId,
    name: profile ? profile.displayName : wagonLabel(surname, composition, party),
    leaderProfession: leaderProf,
    hasChildren,
    seed: `${trainSeed}-${wagonId}`,
    party,
    inventory,
    oxen: generateNpcOxen(wagonId, oxenCount, fresh, rng),
    morale: fresh ? 80 : rng.int(60, 90),
    cash: cashOverride ?? rng.int(40, 300),
    wagon: {
      model: DEFAULT_WAGON_MODEL,
      condition: fresh ? 100 : rng.int(70, 100),
      canvas: fresh ? 100 : rng.int(80, 100),
      carryCapacity: wagonModel.carryCapacity,
      hasBranBarrel: wagonModel.shipsWithBranBarrel === true
    },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    // #895 — persona variant driving this wagon's tick decisions. Named
    // profiles ship a personaVariantHint; random fillers default to
    // 'balanced'. tickNpcWagon falls back to 'balanced' if missing.
    personaId: profile?.personaVariantHint ?? 'balanced',
    water,
    dirtyWater: 0,
    waterCap,
    dryDays: 0
  };
}

export interface GenerateTrainOpts {
  /** `true` for Independence-start joins (every wagon at full
   *  health/condition); `false` for mid-trail (light trail wear). */
  fresh?: boolean;
}

/** Generate a wagon-train roster keyed by (seed, joinDay). The same
 *  inputs always produce the same roster — so a player's "Sager
 *  family" stays the Sager family across save/load. Player joins as
 *  the default leader (#285 voting can flip this later).
 *
 *  Composition is rolled per-wagon: most are families (60%), some are
 *  mixed (15%), some are all-adult parties (15%), a few are solo
 *  prospectors (10%). The roster reads as a real-feeling cross-section
 *  of overland traffic, not a fleet of identical family wagons. */
export function generateTrain(
  seed: string,
  joinDay: number,
  joinedAtLandmarkId: string | null,
  rng: Rng,
  opts: GenerateTrainOpts = {}
): WagonTrain {
  const memberCount = rng.int(5, 12);
  const captain = CAPTAIN_NAMES[rng.int(0, CAPTAIN_NAMES.length - 1)];
  const usedNames = new Set<string>();
  const companions: NpcWagonState[] = [];
  const trainSeed = `${seed}-d${joinDay}`;

  // #287a — half the slots fill from named profiles (Sagers, Donners,
  // Reeds, Joe Meek, etc.), the other half are random fillers per the
  // pre-#287a behavior. Named profiles bypass random surname /
  // profession / composition picks.
  const profilePicks = pickProfilesForRoster(rng, memberCount, {
    freshBias: opts.fresh === true
  });
  // Reserve named-profile surnames up front so random fillers can't
  // accidentally pick the same surname (which would produce a
  // duplicate "the Sager family" wagon alongside the historical one).
  for (const p of profilePicks) {
    if (p) usedNames.add(p.surname);
  }

  for (let i = 0; i < memberCount; i++) {
    const profile = profilePicks[i];
    if (profile) {
      companions.push(generateNpcWagon(
        trainSeed,
        i,
        profile.surname,
        profile.leaderProfession,
        profile.composition,
        rng,
        { fresh: opts.fresh, profile }
      ));
      continue;
    }
    let nameIdx = rng.int(0, FAMILY_NAMES.length - 1);
    let surname = FAMILY_NAMES[nameIdx];
    let attempts = 0;
    while ((usedNames.has(surname) || RESERVED_SURNAMES.has(surname)) && attempts < FAMILY_NAMES.length) {
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
      pickComposition(rng, opts.fresh === true),
      rng,
      { fresh: opts.fresh }
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
