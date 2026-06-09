import type { GameDate, GameState, MemberKind, PartyMember, ProfessionId, Sex } from './types';
import { DEFAULT_WAGON_MODEL, getWagon, type WagonModelId } from './content/wagons';
import { applyDailyConsumption, applyDirtyWaterRisk } from './systems/consumption';
import { tickWeather } from './systems/weather';
import { progressConditions } from './systems/conditions';
import { adjustMorale, pushMoraleHistory } from './systems/morale';
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
import { applyOxHydration } from './systems/ox-hydration';
import { applyStarvation } from './systems/starvation';
import { applyEggLay } from './systems/eggs';
import { applyDietVariety, applyHotDrinks } from './systems/diet';
import { applyWaterRationStrain } from './systems/water-ration';

export interface PartyPick {
  name: string;
  // #1030 — optional for child picks. Adults always carry a profession;
  // children have none (matches PartyMember.profession's optional shape
  // and the existing mid-trail orphan-adoption flow).
  profession?: ProfessionId;
  // Optional in tests; defaults to 'male' to match the save-upgrade default
  // for pre-migration data. Real UI always supplies it.
  sex?: Sex;
  // #1030 — defaults to 'adult'. Child picks are allowed in the starting
  // party so the bot sweep and player wizard can construct the 2-adults-
  // 2-children family demographic (Faragher 1979 / Unruh 1979 modal
  // emigrant unit).
  kind?: MemberKind;
  // #1030 — child age. Defaults: 30 for adults, 8 for children
  // (matches the mid-trail adoption event's typical age range).
  age?: number;
}

export interface NewGameOptions {
  seed: string;
  leader: PartyPick;
  companions: PartyPick[];
  startDate: GameDate;
  // Optional wagon choice. Defaults to prairie schooner (matches pre-#103
  // behavior, so legacy callers get the same result).
  wagonModel?: WagonModelId;
  /** #888b — when false, skip BASE_KIT (food / medicine / rifle /
   *  ammo / tent / rope / per-soul clothing). Default true: new
   *  players get the helper kit. Veterans who toggle off get +$250
   *  refund cash and provision themselves at the outfitter. */
  includeStarterKit?: boolean;
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
  const kind: MemberKind = pick.kind ?? 'adult';
  // Children never carry a profession even if a caller mistakenly supplies
  // one — strip it to keep PartyMember invariants intact.
  const profession = kind === 'child' ? undefined : pick.profession;
  const age = pick.age ?? (kind === 'child' ? 8 : 30);
  return {
    id: `p${index}`,
    name: pick.name,
    profession,
    sex: pick.sex ?? 'male',
    kind,
    isLeader,
    age,
    health: 100,
    cleanliness: 100,
    conditions: [],
    dead: false
  };
}

export function createInitialState(opts: NewGameOptions): GameState {
  // #1030 — leader is always an adult (no child can be the head of a
  // wagon). Companions may be a mix of adults + children. Size limits
  // apply to ADULTS only — historical wagons commonly held 2 adults
  // and 4-7 children (Sager 1844, Donner brothers 1846).
  const adultCompanions = opts.companions.filter((c) => (c.kind ?? 'adult') === 'adult');
  const adultCount = 1 + adultCompanions.length;
  if (adultCount < 2) throw new Error('Party must have at least 2 adults.');
  if (adultCount > 6) throw new Error('Party must have at most 6 adults.');

  const party: PartyMember[] = [
    makeMember({ ...opts.leader, kind: 'adult' }, true, 0),
    ...opts.companions.map((c, i) => makeMember(c, false, i + 1))
  ];

  // Starter kit pulls only adults' professions — children (added via events
  // mid-journey) never contribute to the initial kit since they aren't in the
  // party at creation time. Non-null assertion is safe: every member from the
  // wizard is an adult with a profession set.
  const professions = party.flatMap((m) => (m.profession ? [m.profession] : []));
  const wagonModelId = opts.wagonModel ?? DEFAULT_WAGON_MODEL;
  const kit = buildStarterKit(professions, wagonModelId, {
    includeStarterKit: opts.includeStarterKit ?? true
  });
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
      carryCapacity: wagonModel.carryCapacity,
      hasBranBarrel: wagonModel.shipsWithBranBarrel === true,
      impairment: null
    },
    oxen,
    inventory: kit.inventory,
    cash: kit.cash,
    // Water cap starts at wagon baseline + any starter-kit skins.
    // Trade and outfit flows call recomputeWaterCap() whenever the
    // wagon or water_bag count changes.
    // Firewood starts stocked (~4 nights' worth) so the first week of
    // travel isn't a cold-camp cascade.
    resources: (() => {
      const cap = computeWaterCap(wagonModelId, kit.inventory);
      return { water: cap, waterCap: cap, firewood: 20 };
    })(),
    morale: 70,
    pace: 'moderate',
    rations: 'normal',
    waterRation: 'normal',
    eventLog: [],
    flags: {
      hasBoilingKnowledge: false,
      hadFireLastNight: false,
      // #1189 — auto-Sabbath rest toggle. Default ON for new games.
      // When true, the engine fires sundayLayBy automatically on Sundays
      // during tickDayPausable instead of advancing the day normally.
      // Players can toggle this via the ?/toggleAutoSabbath action.
      _autoSabbathRest: true
    },
    completed: false,
    outcome: 'in-progress',
    // #176 — solo by default. Players join a wagon train via the
    // landmark service at Independence / Kearny / Laramie.
    wagonTrain: null
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
  (s) => applyWaterRationStrain(s), // #1245 — ration strain (morale + sustained HP) while water > 0
  (s) => applyDietVariety(s),      // +1 morale on multi-group days
  (s) => applyHotDrinks(s),        // coffee/tea brew — +1 morale + disease-mod
  (s, rng) => applyDirtyWaterRisk(s, rng), // disease roll — reads coffee/tea
  (s) => applyStarvation(s),       // reads _lastFoodShortfall set above
  tickOxen,
  (s) => applyOxHydration(s), // #1264 — ox desert thirst; before applyTravel so milesPerDay reads today's hydration
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
