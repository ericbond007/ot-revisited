import type { GameDate, GameState, PartyMember, ProfessionId, Sex } from './types';
import { DEFAULT_WAGON_MODEL, getWagon, type WagonModelId } from './content/wagons';
import { applyDailyConsumption, applyDirtyWaterRisk } from './systems/consumption';
import { tickWeather } from './systems/weather';
import { progressConditions } from './systems/conditions';
import { adjustMorale } from './systems/morale';
import { applyHolidays } from './systems/holidays';
import { tickOxen } from './systems/oxen';
import { tickWagon } from './systems/wagon';
import { makeRng, type Rng } from './rng';
import { upgradeState } from './upgrade';
import { applyTravel } from './systems/travel';
import { attemptFire } from './systems/fire';
import { fireEvent } from './systems/events';
import { reapDead } from './systems/death';
import { buildStarterKit } from './content/starter-kit';
import { computeWaterCap } from './systems/water-cap';
import { applyDehydration } from './systems/dehydration';
import { applyStarvation } from './systems/starvation';
import { applyEggLay } from './systems/eggs';
import { applyDietVariety, applyHotDrinks } from './systems/diet';

export interface PartyPick {
  name: string;
  profession: ProfessionId;
  // Optional in tests; defaults to 'male' to match the save-upgrade default
  // for pre-migration data. Real UI always supplies it.
  sex?: Sex;
}

export interface NewGameOptions {
  seed: string;
  leader: PartyPick;
  companions: PartyPick[];
  startDate: GameDate;
  // Optional wagon choice. Defaults to prairie schooner (matches pre-#103
  // behavior, so legacy callers get the same result).
  wagonModel?: WagonModelId;
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
    sex: pick.sex ?? 'male',
    kind: 'adult',
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

  // Starter kit pulls only adults' professions — children (added via events
  // mid-journey) never contribute to the initial kit since they aren't in the
  // party at creation time. Non-null assertion is safe: every member from the
  // wizard is an adult with a profession set.
  const professions = party.flatMap((m) => (m.profession ? [m.profession] : []));
  const wagonModelId = opts.wagonModel ?? DEFAULT_WAGON_MODEL;
  const kit = buildStarterKit(professions, wagonModelId);
  const oxen = Array.from({ length: kit.oxen }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue: 0,
    shod: true
  }));

  const wagonModel = getWagon(wagonModelId);

  return {
    seed: opts.seed,
    day: 1,
    date: { ...opts.startDate },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'kansas_river',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party,
    wagon: {
      model: wagonModelId,
      condition: 100,
      canvas: 100,
      carryCapacity: wagonModel.carryCapacity
    },
    oxen,
    inventory: kit.inventory,
    cash: kit.cash,
    // Water cap starts at wagon baseline + any starter-kit skins.
    // Trade and outfit flows call recomputeWaterCap() whenever the
    // wagon or water_skin count changes.
    // Firewood starts stocked (~4 nights' worth) so the first week of
    // travel isn't a cold-camp cascade.
    resources: (() => {
      const cap = computeWaterCap(wagonModelId, kit.inventory);
      return { water: cap, waterCap: cap, firewood: 20 };
    })(),
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

// --- composition ---
const DAILY_STEPS: TickStep[] = [
  tickWeather,                     // first so every downstream system reads today's weather
  progressConditions,
  (s) => applyEggLay(s), // eggs lay first so they're available to eat
  (s) => applyDailyConsumption(s), // consumption has no Rng param; wrap it
  (s) => applyDietVariety(s),      // +1 morale on multi-group days
  (s) => applyHotDrinks(s),        // coffee/tea brew — +1 morale + disease-mod
  (s, rng) => applyDirtyWaterRisk(s, rng), // disease roll — reads coffee/tea
  (s) => applyStarvation(s),       // reads _lastFoodShortfall set above
  tickOxen,
  tickWagon,
  adjustMorale,
  (s) => applyHolidays(s),
  applyTravel,
  fireEvent,        // <-- new step between travel and fire
  attemptFire,
  // Dehydration runs late — after any step that might have gained water
  // (events, fire attempts with cooking). Any drop of water resets the
  // counter; zero water at this point counts as a dry day.
  (s) => applyDehydration(s),
  reapDead
];

// Roll the 7-day morale history forward. Called at end-of-tick, after
// every system has had its say, so `s.morale` is the day's settled
// value. Drives the party-panel sparkline.
const MORALE_HISTORY_LEN = 7;
function pushMoraleHistory(s: GameState): GameState {
  const prior = Array.isArray(s.moraleHistory) ? s.moraleHistory : [];
  const next = [...prior, s.morale].slice(-MORALE_HISTORY_LEN);
  return { ...s, moraleHistory: next };
}

export function tickDay(state: GameState): GameState {
  const normalized = upgradeState(state);
  const rng = makeRng(`${normalized.seed}:${normalized.day}`);
  let s = normalized;
  for (const step of DAILY_STEPS) {
    s = step(s, rng);
  }
  s = pushMoraleHistory(s);
  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
