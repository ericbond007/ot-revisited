// SO (Standard Operating) Test Model — the project's default gate fixture since 2026-06-11.
//
// This 14-archetype catalog replaces the single 4-adult+2-child fixture that
// the bot harness previously used. Source: docs/superpowers/specs/2026-06-11-party-composition-research.md
//
// Extend by APPENDING to SO_MODEL; do not reorder existing entries (sweep
// result tables are keyed by array index for comparison across runs).
//
// Tier arrival targets (design spec from §5 of the research doc):
//   easy     → 85–90%
//   moderate → 60–75%
//   hard     → 40–55%
//   brutal   → 25–40%
//
// NOTE — companion sex limitation: the runner assigns companion sexes
// alternating (m/f/m/f…). The Whore Train's all-female stock is therefore
// APPROXIMATED (alternating sexes). This is fine for a mechanical test
// model; the sex-parity limitation is tracked at #1165 / TODO below.
//
// NOTE — Mountain Man solo gap: engine.ts throws if adultCount < 2.
// Mountain Man is set to partySize 2 (a minimal companion) until the
// solo-support gap is resolved. See TODO(#1165) comment on that archetype.

import type { ProfessionId } from '../../game/types';
import type { PersonaId } from '../../game/ai/types';

export type SoTier = 'easy' | 'moderate' | 'hard' | 'brutal';

export interface SoArchetype {
  /** Short machine-readable id, unique across SO_MODEL. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Difficulty tier for this composition. */
  tier: SoTier;
  /** Leader profession. */
  leaderProfession: ProfessionId;
  /**
   * Companion professions (1 per companion adult beyond the leader).
   * Array length = partySize - 1. Pass directly as BotRunOpts.companionProfessions.
   */
  companionProfessions: ProfessionId[];
  /** Number of children added on top of the adult partySize. */
  childCount: number;
  /**
   * Fixed persona paired with this archetype.
   * Rationale per archetype documented on each entry.
   */
  persona: PersonaId;
  /**
   * One-line historical anchor. 'gamified' if no direct historical parallel.
   */
  anchor: string;
  /**
   * Target arrival-rate band [min, max] as fractions (0–1).
   * Matches the tier ladder from the research doc §5.
   */
  targetArrival: [number, number];
}

// ---------------------------------------------------------------------------
// The 14-archetype SO_MODEL
// ---------------------------------------------------------------------------
// Persona rationale key:
//   balanced    — general-purpose competent play; good default for family types
//   pace_pusher — drives hard regardless of conditions; suits male crews
//   cautious    — takes rests, careful fords; suits widows/small parties
//   generous    — shares freely, buys morale goods; suits whore/preacher archetypes
//   faithful    — Sabbath rests, prays; suits religious parties
//   aggressive  — pushes through illness and weather; suits gold-rush messes
//   hoarder     — conserves food/supplies; suits child-heavy hard parties
//   drinker     — morale-driven, takes risks; suits speculator/unprepared types
//   chaos       — random decisions; suits the "Unprepared '49er" chaos run

export const SO_MODEL: ReadonlyArray<SoArchetype> = [
  {
    // #1 — The '49er Mess
    // Full survival stack. persona: pace_pusher — gold-rush men drove hard,
    // didn't rest unnecessarily, wanted California fast.
    id: 'mess_49er',
    name: "The '49er Mess",
    tier: 'easy',
    leaderProfession: 'doctor',
    companionProfessions: ['hunter', 'teamster', 'blacksmith', 'scout'],
    childCount: 0,
    persona: 'pace_pusher',
    anchor: "All-male gold-rush mess — Marcy's 50–70-man company in miniature",
    targetArrival: [0.85, 0.90],
  },
  {
    // #2 — The Traditional Family
    // 2 adults + 4 children, modal 1850s Oregon family. persona: balanced —
    // a competent farm family following standard trail practice, steady pace,
    // neither reckless nor timid.
    id: 'family_traditional',
    name: 'The Traditional Family',
    tier: 'moderate',
    leaderProfession: 'farmer',
    companionProfessions: ['doctor'],
    childCount: 4,
    persona: 'balanced',
    anchor: 'Modal 1850s Oregon family wagon — 2 adults + 4 children',
    targetArrival: [0.60, 0.75],
  },
  {
    // #3 — The Widow's Wagon
    // 1 adult female + 3 children. Engine requires ≥2 adults, so we give the
    // widow a hired hand companion (farmer) — the historical pattern
    // (Elizabeth Dixon Smith Geer relied on wagon-train neighbours).
    // persona: cautious — a widow with children can't afford recklessness.
    id: 'widow_wagon',
    name: "The Widow's Wagon",
    tier: 'hard',
    leaderProfession: 'teacher',
    companionProfessions: ['farmer'],
    childCount: 3,
    persona: 'cautious',
    anchor: 'Tabitha Brown 1846 / Elizabeth Dixon Smith Geer — widow-led family',
    targetArrival: [0.40, 0.55],
  },
  {
    // #4 — The Whore Train
    // 1 male leader + 5 companions (whore × 5). partySize 6 adults, 0 children.
    // NOTE: runner assigns sexes alternating — actual all-female stock is
    // approximated. TODO(#1165): add sex override to BotRunOpts for proper
    // all-female companion assignment.
    // persona: generous — a madam's morale economy runs on sharing and
    // spending; Dumont was known for hospitality and generosity.
    id: 'whore_train',
    name: 'The Whore Train',
    tier: 'hard',
    leaderProfession: 'teamster',
    companionProfessions: ['whore', 'whore', 'whore', 'whore', 'whore'],
    childCount: 0,
    persona: 'generous',
    anchor: 'Eleanor Dumont "Madame Mustache" overland 1854 — madam moving stock to the camps',
    targetArrival: [0.40, 0.55],
  },
  {
    // #5 — The Preacher's Flock
    // 2 adults + 2 children. persona: faithful — Sabbath rests, prayer-driven
    // morale, Methodist mission-party doctrine.
    id: 'preachers_flock',
    name: "The Preacher's Flock",
    tier: 'moderate',
    leaderProfession: 'preacher',
    companionProfessions: ['farmer'],
    childCount: 2,
    persona: 'faithful',
    anchor: 'Methodist mission party — Jason Lee 1834; Whitman 1836',
    targetArrival: [0.60, 0.75],
  },
  {
    // #6 — The Doctor's Ambulance
    // 3 adults, best disease survivability. persona: balanced — a doctor-led
    // party is calm and methodical; not reckless, not paranoid.
    id: 'doctors_ambulance',
    name: "The Doctor's Ambulance",
    tier: 'easy',
    leaderProfession: 'doctor',
    companionProfessions: ['hunter', 'teamster'],
    childCount: 0,
    persona: 'balanced',
    anchor: 'Marcus Whitman / generous-doctor archetype — best disease survivability',
    targetArrival: [0.85, 0.90],
  },
  {
    // #7 — The Freight Crew
    // 4 adults, all male, commercial freight. persona: pace_pusher —
    // professional teamsters on a schedule, heavy wagon demands consistency.
    id: 'freight_crew',
    name: 'The Freight Crew',
    tier: 'easy',
    leaderProfession: 'teamster',
    companionProfessions: ['blacksmith', 'carpenter', 'gunsmith'],
    childCount: 0,
    persona: 'pace_pusher',
    anchor: 'Commercial freight outfit hauling to the camps (Conestoga-class)',
    targetArrival: [0.85, 0.90],
  },
  {
    // #8 — The Honeymoon Pair
    // 2 adults, 0 children. Thin labor pool but few mouths.
    // persona: balanced — newlyweds were optimistic and competent enough
    // to attempt the trail; Ezra & Eliza Meeker 1852.
    id: 'honeymoon_pair',
    name: 'The Honeymoon Pair',
    tier: 'moderate',
    leaderProfession: 'hunter',
    companionProfessions: ['doctor'],
    childCount: 0,
    persona: 'balanced',
    anchor: 'Ezra & Eliza Meeker 1852 — newlyweds on the Oregon Trail',
    targetArrival: [0.60, 0.75],
  },
  {
    // #9 — The Extended Clan
    // 4 adults + 4 children. Most mouths; food math bites hard.
    // persona: hoarder — a large clan must ration carefully to survive;
    // Tamzene Donner distributed food to others when her own stores ran low.
    id: 'extended_clan',
    name: 'The Extended Clan',
    tier: 'hard',
    leaderProfession: 'farmer',
    companionProfessions: ['farmer', 'doctor', 'teamster'],
    childCount: 4,
    persona: 'hoarder',
    anchor: 'Donner brothers / Sager clan — big extended-family train',
    targetArrival: [0.40, 0.55],
  },
  {
    // #10 — The Mountain Man
    // NOTE: solo (partySize 1) crashes engine with "Party must have at least 2
    // adults." TODO(#1165): add solo-support to createInitialState. Until then,
    // Mountain Man is partySize 2 with a minimal farmer companion.
    // persona: aggressive — a mountain man pushes through adversity; Joe Meek
    // kept moving after the beaver-trade collapse, never waited for rescue.
    id: 'mountain_man',
    name: 'The Mountain Man',
    tier: 'brutal',
    leaderProfession: 'hunter',
    // TODO(#1165): revert to [] (true solo) once engine supports partySize 1.
    // Minimal companion added only to satisfy the ≥2 adults gate.
    companionProfessions: ['scout'],
    childCount: 0,
    persona: 'aggressive',
    anchor: 'Joe Meek 1840 / Joel Palmer 1845 — experienced solo mountain man',
    targetArrival: [0.25, 0.40],
  },
  {
    // #11 — The Rich Speculator
    // 3 adults + 1 child. Cash-rich, low survival traits.
    // persona: drinker — wealthy speculators drank well, spent freely, and
    // took optimistic risks; James Reed brought champagne to the Sierra.
    id: 'rich_speculator',
    name: 'The Rich Speculator',
    tier: 'moderate',
    leaderProfession: 'banker',
    companionProfessions: ['lawyer', 'merchant'],
    childCount: 1,
    persona: 'drinker',
    anchor: 'James Reed 1846 — wealthy speculator, "Pioneer Palace Car," litigious',
    targetArrival: [0.60, 0.75],
  },
  {
    // #12 — The Unprepared '49er
    // 3 adults, no survival stack. Pure chaos run.
    // persona: chaos — the greenhorn opportunist made random decisions based
    // on rumor and bravado; no plan survives first contact with the Platte.
    id: 'unprepared_49er',
    name: "The Unprepared '49er",
    tier: 'brutal',
    leaderProfession: 'banker',
    companionProfessions: ['merchant', 'lawyer'],
    childCount: 0,
    persona: 'chaos',
    anchor: 'Greenhorn gold-rush opportunist — no survival stack, cash but no skill',
    targetArrival: [0.25, 0.40],
  },
  {
    // #13 — The Trader's Outfit
    // 3 adults, economy-focused, thin survival. persona: generous — a trader's
    // livelihood depends on building goodwill; barter-economy play style.
    id: 'traders_outfit',
    name: "The Trader's Outfit",
    tier: 'moderate',
    leaderProfession: 'indian_trader',
    companionProfessions: ['merchant', 'scout'],
    childCount: 0,
    persona: 'generous',
    anchor: 'Trade-post / Indian-trade outfit; barter economy play',
    targetArrival: [0.60, 0.75],
  },
  {
    // #14 — The Schoolmarm's Wagon
    // 2 adults + 3 children. Flavor professions, child-heavy.
    // persona: cautious — a schoolteacher with three children in her charge
    // takes careful fords, rests the sick, doesn't gamble with lives.
    id: 'schoolmarms_wagon',
    name: "The Schoolmarm's Wagon",
    tier: 'hard',
    leaderProfession: 'teacher',
    companionProfessions: ['preacher'],
    childCount: 3,
    persona: 'cautious',
    anchor: 'Tabitha Brown / John Bidwell (schoolteacher-turned-emigrant) — kid-morale build',
    targetArrival: [0.40, 0.55],
  },
];
