// Core types for the OT: Oregon Trail Revisited game state.
// See spec §3.2 for the full data model.

export type Pace = 'slow' | 'moderate' | 'fast' | 'grueling';
export type Rations = 'meager' | 'normal' | 'filling';
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
  | 'pox';

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
  condition: number; // 0..100
  carryCapacity: number; // lb
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
  pace: Pace;
  rations: Rations;
  eventLog: LogEntry[];
  // Widened to accept small JSON-serializable objects (e.g. _huntHaul
   // from actions/hunt.ts). Still string-keyed and serialization-safe;
   // consumers that expect primitives narrow at the read site.
  flags: Record<string, boolean | number | string | Record<string, unknown> | null>;
  completed: boolean;
  outcome: Outcome;
}

export type GameStateFlag =
  | 'hasBoilingKnowledge'
  | 'hadFireLastNight';
