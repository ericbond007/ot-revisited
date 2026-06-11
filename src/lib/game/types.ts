// Core types for the OT: Oregon Trail Revisited game state.
// See spec §3.2 for the full data model.

import type { PersonaId } from './ai/types';

export type Pace = 'slow' | 'moderate' | 'fast' | 'grueling';
export type Rations = 'meager' | 'normal' | 'filling';
export type WaterRation = 'normal' | 'conserve' | 'drycamp';

// Daily weather state (#153). Chosen each morning by tickWeather based
// on current terrain, season, and yesterday's weather. Drives travel
// speed, water gain/loss, wagon damage, and gates the matching random
// weather events.
export type Weather =
  | 'clear'      // bright + dry, no penalty
  | 'overcast'   // cool, slight water-loss reduction
  | 'rain'       // -15% travel, slow water gain, wet firewood risk
  | 'storm'      // -50% travel, wagon damage, morale hit
  | 'snow'       // -40% travel; mountains may halt entirely
  | 'heat'       // -15% travel, doubled water-loss
  | 'fog'        // -15% travel, easy to wander
  | 'frost';     // morning chill, small morale hit
export type Terrain = 'prairie' | 'forest' | 'desert' | 'mountains' | 'river';
export type Outcome = 'in-progress' | 'arrived' | 'wiped' | 'stranded' | 'snowed_in';

export type ProfessionId =
  | 'banker'
  | 'farmer'
  | 'carpenter'
  | 'doctor'
  | 'blacksmith'
  | 'hunter'
  | 'teamster'
  | 'merchant'
  | 'whore'
  | 'scout'
  | 'preacher'
  | 'indian_trader'
  | 'gunsmith'
  | 'teacher'
  | 'lawyer';

export type ConditionId =
  | 'cholera'
  | 'dysentery'
  | 'typhoid'
  | 'measles'
  | 'exhaustion'
  | 'broken_leg'
  | 'snakebite'
  | 'frostbite'
  | 'scurvy'
  | 'starvation'
  | 'pox'
  | 'bear_mauling';

export interface Condition {
  id: ConditionId;
  daysSinceOnset: number;
}

export type Sex = 'male' | 'female';
export type MemberKind = 'adult' | 'child';

export interface PartyMember {
  id: string;
  name: string;
  // Profession only for adults. Children are recruited via events and have no
  // profession — they contribute through future mechanics (chores, morale).
  profession?: ProfessionId;
  sex: Sex;
  kind: MemberKind;
  isLeader: boolean;
  age: number;
  health: number; // 0..100
  /** Personal cleanliness 0..100 (#230). Drains daily with sweat,
   *  pace, and heat; restored by the wash_clothes camp action at
   *  river camps. Below 30 nicks morale; below 10 raises filth-disease
   *  risk. Defaults to 100 on new + migrated saves. */
  cleanliness?: number;
  conditions: Condition[];
  dead: boolean;
  deathCause?: string;
  deathDay?: number;
  /** Set when the body was eaten via the cannibalism camp action.
   *  Burial events skip a consumed corpse; future cannibalism scans
   *  exclude it. The party still remembers them in the party list. */
  consumed?: boolean;
}

export type DraftKind = 'ox' | 'mule';

// Historically the interface was named Ox and type-narrow to oxen.
// Widened with `kind` so a team can be oxen or mules. Field name kept
// `Ox` for backward compatibility with tests and save files; new code
// should treat this as a DraftAnimal and inspect `kind` to branch.
export interface Ox {
  id: string;
  health: number; // 0..100
  fatigue: number; // 0..100
  /** 0-100, 100 = freshly watered. Optional/legacy → read with `oxHydration()`. */
  hydration?: number;
  shod: boolean;
  // Defaults to 'ox' when missing (legacy saves, older test fixtures).
  kind?: DraftKind;
}

export interface Wagon {
  model: import('./content/wagons').WagonModelId;
  condition: number; // 0..100 — frame integrity (wheels, axle, tongue, planks)
  carryCapacity: number; // lb
  // 0..100 — cotton/linen duck cover, treated with linseed oil. Decays
  // separately from frame condition: rain, storms, sun beat it down,
  // rawhide patches and spare canvas restore it. Low canvas leaks
  // rain into stored supplies (powder, flour, salt) and reduces the
  // rain-water catchment that emigrants relied on in storms.
  canvas: number; // 0..100
  // Bran-fill barrel for the bacon (#264). Period-real wagon kit that
  // doesn't break — it's a trait, not a consumable. Halves heat-day
  // attrition on bacon + salt_pork. Prairie schooner + heavy ship with
  // one by default; light wagon can buy the upgrade at outfit.
  hasBranBarrel?: boolean;
  /** Persistent impairment from a wheel-break "Push on" or failed rebuild
   *  (#929). null when wagon is sound. */
  impairment: WagonImpairment | null;
}

/**
 * Persistent wagon impairment (#929). Set when the player picks "Push on"
 * after a wheel break OR when a rebuild attempt fails. Cleared by smithy
 * repair (town-services.repairWagon), by mounting a spare wheel, or by
 * a successful trailside rebuild. Generalizable later to axle/tongue/canvas
 * — for v1, only `kind: 'wheel'`.
 */
export type WagonImpairment = {
  kind: 'wheel';
  /** Daily pace multiplier (wheel = 0.5). Applied in milesPerDay. */
  paceMult: number;
  /** Condition-decay multiplier (wheel = 2). Applied in tickWagon. */
  conditionDecayMult: number;
  /** Day + mile the impairment was contracted, for log + debrief. */
  contractedAt: { day: number; mile: number };
};

export interface GameDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

export interface Location {
  trailPosition: number; // 0..1 along trail
  nextLandmarkId: string;
  previousLandmarkId: string | null;
  milesTraveled: number;
  terrain: Terrain;
  // When the wagon has just reached a stop-worthy landmark (trading post / river /
  // end), this is that landmark's id. Travel halts until the player continues,
  // which clears this flag.
  atLandmarkId?: string | null;
}

export interface Resources {
  water: number; // gallons of CLEAN, drinkable water
  waterCap: number;
  // Dirty water collected from streams, ponds, sloughs — drinkable
  // only if boiled first. Drinking dirty water risks waterborne
  // disease. Capped at the same waterCap as clean water (sharing the
  // same kegs / barrels). Default 0 / undefined for legacy saves.
  dirtyWater?: number;
  // Firewood in pounds — dried wood, buffalo chips on the plains,
  // sagebrush in the desert, driftwood by rivers. Consumed by the
  // nightly fire (5 lb/night). Gathered passively on travel days and
  // actively via the Gather Firewood camp action.
  firewood?: number;
}

export type ItemId = string; // item catalog IDs — catalog ships in Plan 3

export interface LogEntry {
  day: number;
  text: string;
}

export interface Dog {
  name: string;
}

export interface GameState {
  seed: string;
  day: number;
  date: GameDate;
  location: Location;
  party: PartyMember[];
  wagon: Wagon;
  oxen: Ox[];
  // Optional companion dog. Presence = alive; when killed in events,
  // this field is set to undefined rather than mutated. Events can also
  // grant a new dog to a dogless party (#142).
  dog?: Dog;
  inventory: Record<ItemId, number>;
  cash: number;
  resources: Resources;
  morale: number; // 0..100
  /** Last-7-days rolling history of `morale`. Pushed at the end of each
   *  daily tick and trimmed to 7. Drives the party-panel sparkline; if
   *  shorter than 7 (early game, fresh save) the sparkline pads from
   *  the leftmost value. May be undefined on saves written before the
   *  field existed — readers should default to `[state.morale]`. */
  moraleHistory?: number[];
  pace: Pace;
  rations: Rations;
  waterRation: WaterRation;
  /** Today's weather. Re-rolled each morning by tickWeather. */
  weather?: Weather;
  eventLog: LogEntry[];
  // Widened to accept small JSON-serializable objects (e.g. _huntHaul
   // from actions/hunt.ts). Still string-keyed and serialization-safe;
   // consumers that expect primitives narrow at the read site.
  flags: Record<string, boolean | number | string | string[] | Record<string, unknown> | null>;
  completed: boolean;
  outcome: Outcome;
  /** #176 — When the party has joined a wagon train, the persistent
   *  roster of NPC companion wagons. `null` (or undefined on legacy
   *  saves) means traveling solo. The shape is deliberately narrow —
   *  members carry only the fields shared with a future `RealPlayer`
   *  variant (#284 multiplayer) so an NPC slot can be swapped for a
   *  human without a state-shape rewrite. NPC-only attributes
   *  (relationship tracks, attitude state) live on side maps when
   *  added in #280+. */
  wagonTrain?: WagonTrain | null;
}

// #280a — Shared shape between the player's `GameState` and an NPC
// wagon's `NpcWagonState`. Both satisfy this interface so engine
// systems (consumption, oxen, conditions, morale) can be written
// parametrically and shared. Multiplayer (#284) upgrades an NPC slot
// to a remote-player session — the same field shape.
export interface WagonStateLike {
  party: PartyMember[];
  inventory: Record<ItemId, number>;
  oxen: Ox[];
  morale: number; // 0..100
  cash: number;
  wagon: Wagon;
}

/** #1046 — the train captain's fixed rest doctrine, set at formation
 *  from the captain figure's persona. Static for the journey; the
 *  daily decision it produces is condition-driven. */
export type CaptainDoctrine = 'hard_driver' | 'prudent' | 'devout';

/** #1046 — the company's daily rest decision. Precedence when
 *  computed: crisis > sabbath > maintenance > travel. */
export type CompanyRestMode =
  | 'travel'
  | 'sabbath_layby'
  | 'maintenance_layby'
  | 'crisis_layby';

export interface CompanyRestDecision {
  mode: CompanyRestMode;
  /** Short human-readable why, for logs/UI/tests. */
  reason: string;
  /** #1304 T1 — when mode is 'travel' after the 1-day crisis hold, the
   *  companion wagon ids whose sick member(s) forced the crisis and are
   *  now dropping behind to nurse their own. Absent when there are no NPC
   *  wagons in crisis (player-party-only crisis, or healthy train). */
  dropWagonIds?: string[];
}

// #176 — Wagon-train state. Generated at join time, persists until the
// player splits from the train (or the run ends). See
// `src/lib/game/content/trains.ts` for roster generation.
export interface WagonTrain {
  /** Stable id for the train — train-<seed>-<joinDay>. */
  id: string;
  /** Display name — "Captain Wexford's Company", etc. */
  name: string;
  /** Day the player joined. Used for in-train morale curves and to
   *  persist members across saves. */
  joinedDay: number;
  /** Where the player joined — useful for the leave-train flavor and
   *  for #281 California/Oregon split detection. */
  joinedAtLandmarkId: string | null;
  /** #285 — leadership pointer. `'player'` = the player's wagon is
   *  the captain; otherwise the npc-wagon-id of the captain. Initial
   *  leader picked at create-a-wagon-party (#280e) or auto-elected at
   *  trail-side join (defaults to player). Voting (#285) can flip
   *  this mid-run. */
  leaderId: 'player' | string;
  /** 5-12 NPC companion wagons. Each is a fully-stateful entity with
   *  its own party / inventory / oxen / morale / cash / wagon — the
   *  same shape the player carries. The bot AI (#275) drives each
   *  one's decisions. */
  companions: NpcWagonState[];
  /** #285 phase 2 — when set, the player declines to be a candidate
   *  in elections. Set/cleared from the wagon-train roster modal. The
   *  captaincy will go to the highest-charisma companion instead. */
  playerStandsAside?: boolean;
  /** #1046 — chartered rest doctrine, stamped at generation from the
   *  captain figure's persona. Required on all trains created from
   *  #1046 onward. */
  doctrine: CaptainDoctrine;
  /** #1046 C2 hysteresis state + #1046 B sticky dissent. `dissentChoice`
   *  is recorded once per decision block (the player/bot answered the
   *  dissent prompt for THIS block); the engine reads it instead of
   *  re-prompting. 'abide' → follow the lay-by; 'override'/'lobby_ok' →
   *  the player's day flips to travel for the block; 'press_on' → the
   *  player has left the train (handled at resolve). */
  companyDecisionBlock?: {
    mode: CompanyRestMode;
    blockStartDay: number;
    dissentChoice?: 'abide' | 'override' | 'lobby_ok' | 'lobby_fail' | 'press_on';
    /** #910 — once-per-block dedup for `applyTrainShare`. Set after
     *  a generous NPC successfully transfers food to the player wagon
     *  during this lay-by block; reset implicitly when C2's
     *  `isNewBlock` stamps a fresh companyDecisionBlock. */
    sharedThisBlock?: boolean;
  };
}

// #280a — NPC wagon state. Same field-shape as the player's relevant
// subset (via `WagonStateLike`) plus identity + flavor + per-wagon
// engine state (eventLog, outcome, seed for divergent RNG).
export interface NpcWagonState extends WagonStateLike {
  /** Stable id within the train — wagon-<n>. */
  id: string;
  /** Family or surname display label — "the Sager family." */
  name: string;
  /** Head-of-wagon profession. Drives the train's pooled-services
   *  list, charisma weight (#285), and starter-kit flavor. */
  leaderProfession: ProfessionId;
  /** Visible-children flag for flavor (and #280c child-mortality
   *  arcs). Derived from `party` but kept as a flag for cheap reads. */
  hasChildren: boolean;
  /** Per-wagon seed — distinct from the train's seed so each wagon's
   *  fates diverge. Set at generation. */
  seed: string;
  /** Per-wagon eventLog — events that happened TO this wagon. The
   *  player's `state.eventLog` carries one-line summaries when
   *  notable events fire here (#280c). */
  eventLog: LogEntry[];
  /** Per-wagon outcome — an NPC wagon can be wiped, abandoned, or
   *  arrived independent of the player. Train-level state is the
   *  union of all wagons' outcomes. */
  outcome: Outcome;
  /** #280b — per-wagon rations setting. Bot AI (or #285 leader call)
   *  may flip this when the wagon's food runs low. Defaults to
   *  'normal' on generation. Per-tick override via `persona.pickRations`
   *  in #895. */
  rations: Rations;
  /** #1245 — per-wagon water-ration tier. Gap-aware bot (persona.pickWaterRation)
   *  sets this each travel day. Optional for legacy saves — defaults to
   *  'normal' where absent (same safe fallback as the engine's waterRation ?? 'normal'). */
  waterRation?: WaterRation;
  /** #895 — persona variant driving this wagon's daily decisions.
   *  Set from `profile.personaVariantHint` at gen for named profiles;
   *  defaults to 'balanced' for random fillers. Optional for legacy
   *  saves — `tickNpcWagon` falls back to 'balanced' when missing. */
  personaId?: PersonaId;
  /** Optional companion dog — parity with the player. */
  dog?: Dog;
  /** #303e — per-wagon clean water (gallons). Drains daily via
   *  `applyNpcWaterDrain`, refills via train-water-pool on rest days
   *  (#303e). Initialized to `waterCap` at generation; v2→v3 save
   *  migration fills it on legacy saves. */
  water: number;
  /** Dirty water (gallons) — drinkable only after boiling. Drinking
   *  unboiled rolls dysentery / cholera per `applyNpcDirtyWaterRisk`.
   *  Capped at `waterCap` (shared with clean water). */
  dirtyWater: number;
  /** Total water capacity (gallons). Set from wagon model at generation;
   *  matches the player's `state.resources.waterCap` baseline. */
  waterCap: number;
  /** Consecutive dry days — incremented when `water <= 0` at the end
   *  of `applyNpcDehydration`, reset to 0 on the first wet day. Matches
   *  the player's `flags._dehydrationDays` shape. */
  dryDays: number;
  /** #295 — per-pile spoil-day clocks (item id → day number on which
   *  the pile rots). Mirrors the player's `flags._gameMeatSpoilDay` /
   *  `_eggSpoilDay` / `_berrySpoilDay` / `_milkSpoilDay` clocks but on
   *  a typed map since NPC wagons don't carry a flags blob. Set when
   *  perishable food is added (currently game_meat from #294 company
   *  hunts; future hooks for milk / eggs / berries). Optional —
   *  pre-#295 saves with no spoilDays object are treated as no clocks
   *  set, and `applyNpcSpoilage` is a no-op for them until the engine
   *  next adds a perishable. */
  spoilDays?: Record<string, number>;
  /** #939f — accumulating starvation-days counter. Mirrors player's
   *  `flags._starvationDays`; increments on each food-shortfall day,
   *  drops to 0 on a fed day. Engine `applyStarvation` reads/writes
   *  this via the wagon-synth bridge. Optional — pre-#939f saves
   *  default to 0 (no starvation history). */
  starvationDays?: number;
  /** #300 — miles since the last axle-grease dose. NPC mirror of the
   *  player's `flags._greaseSinceLastDose`. Saturates at the
   *  cycle threshold (500 mi) when the wagon runs out of tar. Optional —
   *  pre-#300 saves treat missing as 0 (a fresh dose is one travel
   *  day away). */
  greaseMiles?: number;
  /** #1266 — generic passthrough for persistent `flags._*` the engine
   *  writes that aren't one of the typed counters above. The synth bridge
   *  packs these into the engine `flags` blob and unpacks them back each
   *  tick, so multi-day flag state (hot-drink clock, holiday-year markers,
   *  cannibalism count) survives the per-tick synth round-trip. Keys are
   *  the magic-string flag names; see NPC_PERSISTENT_FLAG_KEYS. Optional —
   *  absent on legacy saves and whenever no persistent flag is set. */
  persistentFlags?: Record<string, number>;
  /** #1279 — day the starvation-crisis modal was last SURFACED to the player
   *  for the current out-of-food spell. Set at the tickDayPausable surfacing
   *  site (continuations that drop the event don't mark, so it re-fires next
   *  tick); cleared whenever the wagon has food again. */
  crisisAskedDay?: number;
}

export type GameStateFlag =
  | 'hasBoilingKnowledge'
  | 'hadFireLastNight';
