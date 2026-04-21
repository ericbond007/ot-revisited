import type { GameDate, GameState, PartyMember, ProfessionId } from './types';
import { applyDailyConsumption } from './systems/consumption';
import { progressConditions } from './systems/conditions';
import { makeRng, type Rng } from './rng';
import { upgradeState } from './upgrade';

export interface PartyPick {
  name: string;
  profession: ProfessionId;
}

export interface NewGameOptions {
  seed: string;
  leader: PartyPick;
  companions: PartyPick[];
  startDate: GameDate;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function advanceDate(d: GameDate): GameDate {
  let { year, month, day } = d;
  day += 1;
  if (day > daysInMonth(year, month)) {
    day = 1;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { year, month, day };
}

function makeMember(
  pick: PartyPick,
  isLeader: boolean,
  index: number
): PartyMember {
  return {
    id: `p${index}`,
    name: pick.name,
    profession: pick.profession,
    isLeader,
    age: 30,
    health: 100,
    conditions: [],
    dead: false
  };
}

export function createInitialState(opts: NewGameOptions): GameState {
  const size = 1 + opts.companions.length;
  if (size < 2) throw new Error('Party must have at least 2 adults.');
  if (size > 6) throw new Error('Party must have at most 6 adults.');

  const party: PartyMember[] = [
    makeMember(opts.leader, true, 0),
    ...opts.companions.map((c, i) => makeMember(c, false, i + 1))
  ];

  return {
    seed: opts.seed,
    day: 1,
    date: { ...opts.startDate },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party,
    wagon: { condition: 100, carryCapacity: 2500 },
    oxen: [],
    inventory: {
      flour: 500,
      bullets: 20,
      shovel: 1,
      yoke: 1
    },
    cash: 300,
    resources: { water: 20, waterCap: 20 },
    morale: 70,
    pace: 'moderate',
    rations: 'normal',
    eventLog: [],
    flags: { hasBoilingKnowledge: false, hadFireLastNight: false },
    completed: false,
    outcome: 'in-progress'
  };
}

// --- system step signature ---
export type TickStep = (state: GameState, rng: Rng) => GameState;

// --- stubs for systems that arrive in later tasks ---
const tickOxen: TickStep = (s) => s;
const tickWagon: TickStep = (s) => s;
const adjustMorale: TickStep = (s) => s;
const applyTravel: TickStep = (s) => s;
const attemptFire: TickStep = (s) => s;
const reapDead: TickStep = (s) => s;

// --- composition ---
const DAILY_STEPS: TickStep[] = [
  progressConditions,
  (s) => applyDailyConsumption(s), // consumption has no Rng param; wrap it
  tickOxen,
  tickWagon,
  adjustMorale,
  applyTravel,
  attemptFire,
  reapDead
];

export function tickDay(state: GameState): GameState {
  const normalized = upgradeState(state);
  const rng = makeRng(`${normalized.seed}:${normalized.day}`);
  let s = normalized;
  for (const step of DAILY_STEPS) {
    s = step(s, rng);
  }
  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
