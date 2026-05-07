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
import type { ProfessionId } from '../types';
import type { WagonComposition } from './trains';

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
  /** Leader's profession. Must exist in the catalog. Slice A is
   *  constrained to professions that exist today (no `lawyer` for
   *  Hastings yet — banker stand-in until the ProfessionId is
   *  expanded with attorney-class roles, see #322 follow-up). */
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
    year: 1844,
    trait: 'Both parents died on the trail; the seven children completed the journey under the care of fellow emigrants.',
    source: 'https://en.wikipedia.org/wiki/Sager_children'
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
    year: 1846,
    trait: 'Captain by acclamation. Tamzene distributed food to others as their own stores ran low in the Sierra.',
    source: 'https://en.wikipedia.org/wiki/Donner_Party'
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
    year: 1846,
    trait: 'Famously impatient; built the heavy "Pioneer Palace Car"; banished after killing teamster John Snyder in a whip-fight.',
    source: 'https://en.wikipedia.org/wiki/James_Reed_(pioneer)'
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
    year: 1840,
    trait: 'Mountain man whose beaver-trade collapse drove him to Oregon. Later first U.S. Marshal of Oregon Territory.',
    source: 'https://en.wikipedia.org/wiki/Joe_Meek'
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
    year: 1836,
    trait: 'First wagons west; Narcissa among the first white women over the Rockies. Killed in the 1847 Whitman Massacre.',
    source: 'https://en.wikipedia.org/wiki/Marcus_Whitman'
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
