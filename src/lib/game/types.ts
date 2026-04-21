// Core types for the Hoosier Trail game state.
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
  | 'scurvy';

export interface Condition {
  id: ConditionId;
  daysSinceOnset: number;
}

export interface PartyMember {
  id: string;
  name: string;
  profession: ProfessionId;
  isLeader: boolean;
  age: number;
  health: number; // 0..100
  conditions: Condition[];
  dead: boolean;
  deathCause?: string;
  deathDay?: number;
}

export interface Ox {
  id: string;
  health: number; // 0..100
  fatigue: number; // 0..100
  shod: boolean;
}

export interface Wagon {
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
}

export interface Resources {
  water: number; // gallons on hand
  waterCap: number;
}

export type ItemId = string; // item catalog IDs — catalog ships in Plan 3

export interface LogEntry {
  day: number;
  text: string;
}

export interface GameState {
  seed: string;
  day: number;
  date: GameDate;
  location: Location;
  party: PartyMember[];
  wagon: Wagon;
  oxen: Ox[];
  inventory: Record<ItemId, number>;
  cash: number;
  resources: Resources;
  morale: number; // 0..100
  pace: Pace;
  rations: Rations;
  eventLog: LogEntry[];
  flags: Record<string, boolean | number>;
  completed: boolean;
  outcome: Outcome;
}

export type GameStateFlag =
  | 'hasBoilingKnowledge'
  | 'hadFireLastNight';
