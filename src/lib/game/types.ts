// Core types for the OT: Oregon Trail Revisited game state.
// See spec §3.2 for the full data model.

export type Pace = 'slow' | 'moderate' | 'fast' | 'grueling';
export type Rations = 'meager' | 'normal' | 'filling';

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
export type Outcome = 'in-progress' | 'arrived' | 'wiped' | 'stranded';

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
  | 'gunsmith';

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
}

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
  /** Today's weather. Re-rolled each morning by tickWeather. */
  weather?: Weather;
  eventLog: LogEntry[];
  // Widened to accept small JSON-serializable objects (e.g. _huntHaul
   // from actions/hunt.ts). Still string-keyed and serialization-safe;
   // consumers that expect primitives narrow at the read site.
  flags: Record<string, boolean | number | string | Record<string, unknown> | null>;
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
  /** 5-15 wagon-companion NPCs. Each is a "wagon," not a person — one
   *  member ≈ one family wagon, with ox count + profession + flag for
   *  whether they're traveling with children. */
  members: TrainMember[];
}

export interface TrainMember {
  /** Stable id within the train — member-N. */
  id: string;
  /** Family or surname display label — "the Sager family." */
  name: string;
  /** Head-of-wagon profession. Drives the train's pooled-services list. */
  profession: ProfessionId;
  /** Working ox count for this member's wagon — drives #283 ox-pool. */
  oxCount: number;
  /** Visible-children flag for flavor (and future child-mortality arcs
   *  in #280). */
  hasChildren: boolean;
  /** Cash on hand — flavor for #283 trade dynamics. */
  cash: number;
}

export type GameStateFlag =
  | 'hasBoilingKnowledge'
  | 'hadFireLastNight';
