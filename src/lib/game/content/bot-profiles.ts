// #287a — Named bot profiles for wagon-train companions.
//
// Currently every NPC wagon is a seeded-random roster — every game
// generates fresh strangers. Bot profiles add named, recognizable AI
// personas: stable family composition (the Sagers = always Henry +
// Naomi + 7 orphans), stable leader profession, and (in #287b) a
// distinct play style.
//
// Slice A scope (this file): registry + 10 launch profiles + the
// roster-allocation helper. No persona-variant work yet (uses the
// existing 4 personas as stand-ins). No kit picker yet.
//
// Source: docs/handoff/bot-profiles-dossier.md — 10 vetted profiles
// with composition / leader profession / fate / Wikipedia citations.

import type { Rng } from '../rng';
import type { ProfessionId, GameState } from '../types';
import type { WagonComposition } from './trains';
import type { NewGameOptions, PartyPick } from '../engine';
import type { GameDate } from '../types';

/** A single party member within a named profile. The `surname` is
 *  inherited from the profile by default; per-member `surname` is for
 *  in-laws / friends / hired hands whose family name differs. */
export interface BotProfileMember {
  /** Role drives ordering + the wagonLabel logic ("the Sager family"
   *  vs "Joe Meek"). One leader per profile. */
  role: 'leader' | 'spouse' | 'child' | 'extra';
  sex: 'male' | 'female';
  /** First name only; surname inherited from the profile unless
   *  overridden. */
  given: string;
  age: number;
  /** Optional surname override (in-laws, hired hands, friends). */
  surname?: string;
}

export interface BotProfile {
  /** Stable id, kebab-case (`sager-family`, `joe-meek`). */
  id: string;
  /** Family surname for leader + most members. */
  surname: string;
  /** What renders in the roster panel + event log. "the Sager family",
   *  "Joe Meek", "Whitman Mission party". */
  displayName: string;
  /** Maps to the existing trains.ts archetype for wagon-label logic +
   *  inventory generation. */
  composition: WagonComposition;
  leaderProfession: ProfessionId;
  /** Verbatim party. Order matters: leader first, spouse second,
   *  children before extras. */
  party: BotProfileMember[];
  /** #287b will replace this with a real PersonaId. For slice A this
   *  is informational only — picks one of the 4 existing personas as
   *  the closest fit. */
  personaVariantHint:
    | 'cautious'
    | 'balanced'
    | 'aggressive'
    | 'chaos'
    | 'sunday_rester'  // future
    | 'pace_pusher'    // future
    | 'hoarder'        // future
    | 'generous'       // future
    | 'faithful'       // future
    | 'drinker';       // future
  /** Year the historical figure crossed. Informational; could later
   *  scope which years a profile is eligible for. */
  year: number;
  /** One-line trait that distinguishes the profile in dossier terms.
   *  Surfaced in flavor logs (`"the Sagers — both parents died on the
   *  trail"`). */
  trait: string;
  /** Source citation — primary Wikipedia URL from the dossier. */
  source: string;
  /** #888a — complete starting inventory for this profile. When set,
   *  this is the FULL Layer-0 inventory for the NPC wagon (no random
   *  base layer, no BASE_KIT — profile owns its own kit per Dave's
   *  pivot). Profession.starterGear still layers ADDITIVELY on top
   *  (e.g. hunter brings bullet_mold + lead_pig regardless of which
   *  hunter-led profile is in play). Profiles that DON'T set `kit`
   *  fall through to `generateNpcInventory` for a random kit.
   *
   *  Special key: `cash` lands on wagon-level cash field, not
   *  inventory dict. Used for wealthy profiles (Reed family).
   *
   *  Pre-#888a this was `kitOverrides` — partial overrides on a
   *  random base. Renamed + semantics shifted: now COMPLETE. */
  kit?: Record<string, number>;
  /** Player-facing difficulty signal. Authored by hand per profile.
   *  Drives the card badge on /new; does NOT modify game balance. */
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary';
  /** Whether this profile is surfaced as a player option on /new.
   *  False = NPC-only (special-case data or not yet vetted for player
   *  balance). #102 ships with Joe Meek, Tabitha Brown, Joel Palmer, and Hastings as `playerEligible: false`
   *  (Meek + Brown are solo profiles; engine requires 2 adults — see #1165);
   *  flip after his kit lands (#887). Note that `kit` absence alone does
   *  NOT block eligibility — kit-less profiles fall through to
   *  `generateNpcInventory`'s random fallback, which is acceptable for v1
   *  (Tabitha Brown, Meeker family). #887 will batch-add their kits. */
  playerEligible: boolean;
}

/** The 10 launch profiles. Source: docs/handoff/bot-profiles-dossier.md.
 *  Each record is verbatim from the dossier — composition + names +
 *  ages match historical record (or are flagged as "varies" / first
 *  best guess where the record is thin). */
export const LAUNCH_PROFILES: BotProfile[] = [
  {
    id: 'sager-family',
    surname: 'Sager',
    displayName: 'the Sager family',
    composition: 'family',
    leaderProfession: 'farmer',
    party: [
      { role: 'leader', sex: 'male',   given: 'Henry',     age: 38 },
      { role: 'spouse', sex: 'female', given: 'Naomi',     age: 36 },
      { role: 'child',  sex: 'male',   given: 'John',      age: 13 },
      { role: 'child',  sex: 'male',   given: 'Frank',     age: 11 },
      { role: 'child',  sex: 'female', given: 'Catherine', age: 9 },
      { role: 'child',  sex: 'female', given: 'Elizabeth', age: 7 },
      { role: 'child',  sex: 'female', given: 'Matilda',   age: 5 },
      { role: 'child',  sex: 'female', given: 'Hannah',    age: 3 },
      { role: 'child',  sex: 'female', given: 'Henrietta', age: 0 }
    ],
    personaVariantHint: 'faithful',
    difficulty: 'normal',
    playerEligible: true,
    year: 1844,
    trait: 'Both parents died on the trail; the seven children completed the journey under the care of fellow emigrants.',
    source: 'https://en.wikipedia.org/wiki/Sager_children',
    // 9 souls (2 + 7 kids) — methodical Ohio farmer outfit with the
    // family-evening props that defined Sager camp life. Farmer
    // profession adds nothing (pure mechanic post-#890).
    kit: {
      // Food — scaled for 9 mouths
      flour: 350, beans: 60, bacon: 45, coffee: 3, salt: 3, saleratus: 5,
      // Family medicine chest (BASE-equivalent)
      quinine: 4, calomel: 2, laudanum: 2, paregoric: 2, bandages: 8,
      // Tools
      shovel: 1, cookware: 1,
      // Outfitter package
      rifle: 1, gunpowder: 25, lead_balls: 25, percussion_caps: 25,
      tent: 1, rope: 1,
      // Per-soul gear
      coat: 9, blanket: 9, boots: 9,
      // Sager signature
      bible: 1, fiddle: 1,
      // #297 — Ohio farm family habit: 4 hens in a coop strapped to the
      // wagon bed. Daily egg lay yields 2 eggs/day until they're eaten,
      // sold, or eaten by predators (#138 events).
      chicken: 4
    }
  },
  {
    id: 'donner-family',
    surname: 'Donner',
    displayName: 'the Donner family',
    composition: 'family',
    leaderProfession: 'farmer',
    party: [
      { role: 'leader', sex: 'male',   given: 'George',  age: 62 },
      { role: 'spouse', sex: 'female', given: 'Tamzene', age: 45 },
      { role: 'child',  sex: 'female', given: 'Elitha',  age: 14 },
      { role: 'child',  sex: 'female', given: 'Leanna',  age: 12 },
      { role: 'child',  sex: 'female', given: 'Frances', age: 6 },
      { role: 'child',  sex: 'female', given: 'Georgia', age: 4 },
      { role: 'child',  sex: 'female', given: 'Eliza',   age: 3 }
    ],
    personaVariantHint: 'generous',
    difficulty: 'legendary',
    playerEligible: true,
    year: 1846,
    trait: 'Captain by acclamation. Tamzene distributed food to others as their own stores ran low in the Sierra.',
    source: 'https://en.wikipedia.org/wiki/Donner_Party',
    // 7 souls — settlers leaving Springfield, IL in comfort. Tamzene's
    // china survived the Sierra winter; George's anvil for the California
    // smithy he planned to start. Farmer profession adds nothing post-#890.
    kit: {
      // Food — scaled for 7
      flour: 280, beans: 50, bacon: 40, coffee: 4, salt: 3, saleratus: 4,
      // Medicine
      quinine: 4, calomel: 2, laudanum: 2, paregoric: 2, bandages: 8,
      // Tools
      shovel: 1, cookware: 1,
      // Outfitter package
      rifle: 1, gunpowder: 25, lead_balls: 25, percussion_caps: 25,
      tent: 1, rope: 1,
      // Per-soul gear
      coat: 7, blanket: 7, boots: 7,
      // Donner signature — settlers' luxury haul
      china_tea_set: 1, anvil: 1
    }
  },
  {
    id: 'reed-family',
    surname: 'Reed',
    displayName: 'the Reed family',
    composition: 'family',
    // Reed's actual profession was furniture manufacturer + land
    // speculator — best mapped to `banker` in slice A. Future #287b/c
    // may switch to `lawyer` once the rebalance allows mid-flight
    // profession switches per profile.
    leaderProfession: 'banker',
    party: [
      { role: 'leader', sex: 'male',   given: 'James',    age: 45 },
      { role: 'spouse', sex: 'female', given: 'Margaret', age: 32 },
      { role: 'child',  sex: 'female', given: 'Virginia', age: 13 },
      { role: 'child',  sex: 'female', given: 'Patty',    age: 8 },
      { role: 'child',  sex: 'male',   given: 'James Jr.', age: 5 },
      { role: 'child',  sex: 'male',   given: 'Thomas',   age: 3 },
      { role: 'extra',  sex: 'female', given: 'Sarah',    age: 70, surname: 'Keyes' } // Margaret's mother
    ],
    personaVariantHint: 'pace_pusher',
    difficulty: 'hard',
    playerEligible: true,
    year: 1846,
    trait: 'Famously impatient; built the heavy "Pioneer Palace Car"; banished after killing teamster John Snyder in a whip-fight.',
    source: 'https://en.wikipedia.org/wiki/James_Reed_(pioneer)',
    // 7 souls + Sarah Keyes — the "Pioneer Palace Car." Wealthy
    // Springfield household; Virginia Reed Murphy's memoir is a
    // catalog of luxury overload. Banker profession adds $1000 cash
    // on top of the $600 here = $1600 total starting wealth.
    kit: {
      // Food — wealthy stock, more variety
      flour: 250, beans: 45, bacon: 50, coffee: 6, salt: 3, saleratus: 4,
      sugar: 5,
      // Medicine — well-supplied
      quinine: 4, calomel: 2, laudanum: 2, paregoric: 2, bandages: 10,
      // Tools — duplicated for redundancy (wealth)
      shovel: 1, cookware: 2, rope: 2,
      // Outfitter package
      rifle: 1, gunpowder: 30, lead_balls: 30, percussion_caps: 30,
      tent: 1,
      // Per-soul gear
      coat: 7, blanket: 7, boots: 7,
      // Reed signature — Pioneer Palace Car
      feather_mattress: 1, china_tea_set: 1, family_bible: 1,
      // Wealth on top of banker's $1000
      cash: 600
    }
  },
  {
    id: 'joe-meek',
    surname: 'Meek',
    displayName: 'Joe Meek',
    composition: 'solo',
    leaderProfession: 'hunter',
    party: [
      { role: 'leader', sex: 'male', given: 'Joseph', age: 26 }
    ],
    personaVariantHint: 'chaos',
    difficulty: 'easy',
    playerEligible: false,
    year: 1840,
    trait: 'Mountain man whose beaver-trade collapse drove him to Oregon. Later first U.S. Marshal of Oregon Territory.',
    source: 'https://en.wikipedia.org/wiki/Joe_Meek',
    // Solo mountain-man kit. Lean food (he ate game), heavy ammo,
    // pre-cured jerky, whiskey for the long nights. Hunter profession
    // adds bullet_mold + 2 lead_pig on top — Joe Meek's casting bench.
    kit: {
      // Food — minimal (lived off the rifle)
      flour: 30, beans: 5, bacon: 10, coffee: 3, salt: 1, saleratus: 1,
      // Medicine — basic
      quinine: 1, bandages: 4,
      // Tools
      cookware: 1,
      // Outfitter — heavy on shooting consumables
      rifle: 1, gunpowder: 40, lead_balls: 30, percussion_caps: 25,
      tent: 1, rope: 1,
      // Per-soul (solo)
      coat: 1, blanket: 1, boots: 1,
      // Joe Meek signature
      jerky: 20, whiskey: 4
    }
  },
  {
    id: 'whitman-mission',
    surname: 'Whitman',
    displayName: 'the Whitman party',
    composition: 'mixed',
    leaderProfession: 'doctor',
    party: [
      { role: 'leader', sex: 'male',   given: 'Marcus',    age: 34 },
      { role: 'spouse', sex: 'female', given: 'Narcissa',  age: 28 }
    ],
    personaVariantHint: 'sunday_rester',
    difficulty: 'hard',
    playerEligible: true,
    year: 1836,
    trait: 'First wagons west; Narcissa among the first white women over the Rockies. Killed in the 1847 Whitman Massacre.',
    source: 'https://en.wikipedia.org/wiki/Marcus_Whitman',
    // 2 souls — the 1836 Whitman / Spalding mission party. Doctor
    // profession adds medical_books + dovers_powder; Whitman's kit
    // doubles down on bibles + a primer for the Sunday observance
    // that defined the mission.
    kit: {
      // Food — small party
      flour: 80, beans: 20, bacon: 20, coffee: 3, salt: 2, saleratus: 2,
      // Medicine (doctor adds more)
      quinine: 4, calomel: 2, laudanum: 2, paregoric: 2, bandages: 8,
      // Tools
      shovel: 1, cookware: 1,
      // Outfitter package
      rifle: 1, gunpowder: 30, lead_balls: 30, percussion_caps: 30,
      tent: 1, rope: 1,
      // Per-soul gear
      coat: 2, blanket: 2, boots: 2,
      // Whitman signature — mission literacy props
      bible: 2, primer: 1,
      // #297 — Narcissa Whitman's well-known dairy aspirations: the
      // mission party brought two milk cows tied behind the wagon
      // plus a butter crock for the in-wagon churn (#222). Daily milk
      // + butter yields land in inventory each travel day.
      milk_cow: 2, butter_crock: 1
    }
  },
  {
    id: 'tabitha-brown',
    surname: 'Brown',
    displayName: 'Tabitha Brown',
    composition: 'solo',
    // No `teacher` profession existed before #317a; using it now as
    // the period-correct map for Brown's pre-trail occupation.
    leaderProfession: 'teacher',
    party: [
      { role: 'leader', sex: 'female', given: 'Tabitha', age: 66 }
    ],
    personaVariantHint: 'cautious',
    difficulty: 'hard',
    playerEligible: false,
    year: 1846,
    trait: 'Crossed at age 66 on foot through the Umpqua Mountains. Founded what became Pacific University.',
    source: 'https://en.wikipedia.org/wiki/Tabitha_Brown'
  },
  {
    id: 'meeker-family',
    surname: 'Meeker',
    displayName: 'the Meeker family',
    composition: 'family',
    leaderProfession: 'farmer',
    party: [
      { role: 'leader', sex: 'male',   given: 'Ezra',  age: 21 },
      { role: 'spouse', sex: 'female', given: 'Eliza', age: 20 },
      { role: 'child',  sex: 'male',   given: 'Oliver', age: 0 }
    ],
    personaVariantHint: 'balanced',
    difficulty: 'normal',
    playerEligible: true,
    year: 1852,
    trait: 'Methodical, well-prepared. Re-crossed by ox-wagon at age 75 to mark the trail with monuments.',
    source: 'https://en.wikipedia.org/wiki/Ezra_Meeker'
  },
  {
    id: 'bidwell-party',
    surname: 'Bidwell',
    displayName: 'the Bidwell-Bartleson party',
    composition: 'all_adult',
    leaderProfession: 'teacher',
    party: [
      { role: 'leader', sex: 'male',   given: 'John',  age: 22 },
      { role: 'extra',  sex: 'male',   given: 'John',  age: 38, surname: 'Bartleson' },
      { role: 'extra',  sex: 'male',   given: 'James', age: 50, surname: 'Clyman' },
      { role: 'extra',  sex: 'female', given: 'Nancy', age: 18, surname: 'Kelsey' }
    ],
    personaVariantHint: 'aggressive',
    difficulty: 'hard',
    playerEligible: true,
    year: 1841,
    trait: 'First emigrant wagon train to California. Abandoned wagons in Nevada; finished on foot and horseback.',
    source: 'https://en.wikipedia.org/wiki/John_Bidwell'
  },
  {
    id: 'joel-palmer',
    surname: 'Palmer',
    displayName: 'Joel Palmer',
    composition: 'solo',
    leaderProfession: 'carpenter',
    party: [
      { role: 'leader', sex: 'male', given: 'Joel', age: 30 }
    ],
    personaVariantHint: 'balanced',
    difficulty: 'easy',
    playerEligible: false,
    year: 1845,
    trait: 'Surveyed the Barlow Road around Mt. Hood. His "Journal of Travels" became the standard 1840s emigrant guidebook.',
    source: 'https://en.wikipedia.org/wiki/Joel_Palmer'
  },
  {
    id: 'lansford-hastings',
    surname: 'Hastings',
    displayName: 'Lansford Hastings',
    composition: 'solo',
    // Hastings was a lawyer + land speculator. Mapped to `lawyer`
    // (added in #317a). His Cutoff guidebook directly killed the
    // Donner Party.
    leaderProfession: 'lawyer',
    party: [
      { role: 'leader', sex: 'male', given: 'Lansford', age: 22 }
    ],
    personaVariantHint: 'pace_pusher',
    difficulty: 'legendary',
    playerEligible: false,
    year: 1842,
    trait: 'Promoted the unproven Hastings Cutoff. Author of the unreliable 1845 Emigrant\'s Guide. Fled to Brazil after the war.',
    source: 'https://en.wikipedia.org/wiki/Lansford_Hastings'
  }
];

/** Lookup by id. Throws if not in the registry. */
export function getBotProfile(id: string): BotProfile {
  const p = LAUNCH_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown bot profile: ${id}`);
  return p;
}

/** #102 — Convert a BotProfile to the NewGameOptions shape the
 *  player-side `createInitialState` accepts. Maps members 1:1 to
 *  PartyPicks (leader first), forces `includeStarterKit: false`
 *  (the profile's `kit` is the kit; BASE_KIT would double-up). */
export function profileToNewGameOptions(
  profile: BotProfile,
  startDate: GameDate,
  seed: string
): NewGameOptions {
  const memberToPick = (m: BotProfileMember): PartyPick => ({
    name: m.given,
    profession: m.role === 'leader' ? profile.leaderProfession : 'farmer', // bland default for non-leaders; children's profession is stripped by makeMember
    sex: m.sex,
    kind: m.role === 'child' ? 'child' : 'adult',
    age: m.age
  });

  const [leaderMember, ...rest] = profile.party;
  return {
    seed,
    leader: memberToPick(leaderMember),
    companions: rest.map(memberToPick),
    startDate,
    includeStarterKit: false
  };
}

/** Pick which slots in a roster get named profiles. Returns an array
 *  the same length as `slotCount` — entries are either a `BotProfile`
 *  or `null` (random filler). Names don't repeat within a roster.
 *
 *  `namedFraction` defaults to 0.5 — half named, half random. The
 *  random fillers preserve the existing trains.ts behavior so the
 *  rosters still feel like a cross-section of overland traffic, not
 *  a cast of celebrities.
 *
 *  `freshBias` (default true at Independence-start) drops solo
 *  profiles from the pool. Period reality: emigrants assembled into
 *  companies BEFORE departure — solos at Independence were rare
 *  oddballs. Mid-trail solos (Joe Meek, Brown, Palmer, Hastings)
 *  are appropriate, so freshBias=false at mid-trail joins. */
export function pickProfilesForRoster(
  rng: Rng,
  slotCount: number,
  opts: { namedFraction?: number; freshBias?: boolean } = {}
): Array<BotProfile | null> {
  const namedFraction = opts.namedFraction ?? 0.5;
  const freshBias = opts.freshBias ?? false;
  const namedTarget = Math.round(slotCount * namedFraction);
  // Shuffle the profile pool so picks vary by seed.
  let pool = [...LAUNCH_PROFILES];
  if (freshBias) {
    pool = pool.filter((p) => p.composition !== 'solo');
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks: Array<BotProfile | null> = [];
  for (let i = 0; i < slotCount; i++) {
    if (i < namedTarget && i < pool.length) {
      picks.push(pool[i]);
    } else {
      picks.push(null);
    }
  }
  // Shuffle the named/null mix so named profiles aren't always
  // bunched at the front of the roster.
  for (let i = picks.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks;
}

/** #102 — Apply a profile's `kit` to an already-constructed GameState
 *  as the layer-0 inventory (parallel to generateNpcWagon's profile.kit
 *  handling for NPCs). Mutates and returns the state for chaining.
 *  No-op if `profile.kit` is undefined.
 *
 *  Cash lands on `state.cash` (top-level field). All other entries
 *  land on `state.inventory[key]`, ADDED to whatever profession
 *  starterGear left there (so hunter-led profiles still get their
 *  bullet_mold + lead_pig from starterGear, layered with profile.kit). */
export function applyProfileKit(state: GameState, profile: BotProfile): GameState {
  if (!profile.kit) return state;
  const next: GameState = { ...state, inventory: { ...state.inventory } };
  for (const [key, qty] of Object.entries(profile.kit)) {
    if (key === 'cash') {
      next.cash = (next.cash ?? 0) + qty;
    } else {
      next.inventory[key] = (next.inventory[key] ?? 0) + qty;
    }
  }
  return next;
}
