// Dev-only quick-start scenarios. Builds a `GameState` positioned at a
// specific landmark or in a specific condition so we can land in a UI
// screen without playing through the whole trail.
//
// Each scenario is a pure `() => GameState` builder. Consumers:
//   - The landing-page Dev panel (only shown when import.meta.env.DEV).
//   - The `/?/loadScenario` server action in src/routes/+page.server.ts.
//
// Scenarios should be composable from small helpers (atLandmark,
// setInventory, setFlag, etc.) — keeping each builder a short recipe
// rather than a 40-line state mutation.

import type { GameState, Terrain, ConditionId } from '$lib/game/types';
import type { HuntHaul } from '$lib/game/actions/hunt';
import { createInitialState } from '$lib/game/engine';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '$lib/game/content/landmarks';
import { computeSpoilDay } from '$lib/game/systems/spoilage';
import { rest } from '$lib/game/actions/rest';
import { ford } from '$lib/game/actions/ford';
import { trade } from '$lib/game/actions/trade';

export interface Scenario {
  id: string;
  label: string;
  description: string;
  build: () => GameState;
}

// -- helpers --

/** Sum of milesFromPrevious from Independence through the named landmark. */
function runningMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  throw new Error(`runningMilesTo: unknown landmark ${id}`);
}

/** Starter state shared by every scenario: a small, seeded party. */
function baseState(seed = 'dev-scenario'): GameState {
  return createInitialState({
    seed,
    leader: { name: 'Dave', profession: 'farmer', sex: 'male' },
    companions: [
      { name: 'Ellen',  profession: 'doctor',  sex: 'female' },
      { name: 'Samuel', profession: 'hunter',  sex: 'male' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

/**
 * Teleport the party to a named landmark. Sets location.atLandmarkId,
 * previousLandmarkId, nextLandmarkId, milesTraveled, and terrain.
 * Advances the in-game day/date proportional to the miles traveled
 * (assuming ~18 mi/day — close enough for a test harness).
 */
function atLandmark(state: GameState, landmarkId: string): GameState {
  const landmark = getLandmark(landmarkId);
  const after = nextLandmarkAfter(landmarkId);
  const miles = runningMilesTo(landmarkId);
  const days = Math.max(1, Math.ceil(miles / 18));

  // Advance date day-by-day so month/year rollovers stay correct.
  const date = { ...state.date };
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let i = 0; i < days - 1; i++) {
    const leap = (date.year % 4 === 0 && date.year % 100 !== 0) || date.year % 400 === 0;
    const cap = date.month === 2 && leap ? 29 : daysInMonth[date.month - 1];
    date.day += 1;
    if (date.day > cap) { date.day = 1; date.month += 1; }
    if (date.month > 12) { date.month = 1; date.year += 1; }
  }

  // River crossings have terrain 'river' but the party stands on the
  // previous leg's surface until they cross. Fall back to the previous
  // landmark's terrain for rivers, otherwise use the landmark's own.
  const terrain: Terrain = landmark.kind === 'river'
    ? (state.location.terrain ?? 'prairie')
    : landmark.terrain;

  return {
    ...state,
    day: days,
    date,
    location: {
      ...state.location,
      previousLandmarkId: landmarkId,
      nextLandmarkId: after?.id ?? landmarkId,
      milesTraveled: miles,
      terrain,
      atLandmarkId: landmarkId
    }
  };
}

/** Replace inventory entries with the provided partial (merged into existing). */
function setInventory(state: GameState, patch: Record<string, number>): GameState {
  return { ...state, inventory: { ...state.inventory, ...patch } };
}

/** Set one or more flag values (merged). */
function setFlags(state: GameState, patch: Record<string, unknown>): GameState {
  return { ...state, flags: { ...state.flags, ...patch } as GameState['flags'] };
}

/** Give a named party member a condition (by id, with onset=0). */
function giveCondition(state: GameState, memberIdx: number, conditionId: ConditionId): GameState {
  return {
    ...state,
    party: state.party.map((m, i) =>
      i === memberIdx
        ? { ...m, conditions: [...m.conditions, { id: conditionId, daysSinceOnset: 0 }] }
        : m
    )
  };
}

// -- scenarios --

export const SCENARIOS: Scenario[] = [
  {
    id: 'at_kearny',
    label: 'Fort Kearny',
    description: 'Standard party parked at Fort Kearny — US Army quartermaster (sells only).',
    build: () => atLandmark(baseState('kearny'), 'ft_kearny')
  },
  {
    id: 'at_kansas_river',
    label: 'Kansas River',
    description: 'First river crossing — ford/caulk/ferry decision point.',
    build: () => atLandmark(baseState('kansas'), 'kansas_river')
  },
  {
    id: 'at_laramie',
    label: 'Fort Laramie',
    description: 'Fur-trade hub in the mid-plains. Broadest stock on the trail, highest prices.',
    build: () => atLandmark(baseState('laramie'), 'ft_laramie')
  },
  {
    id: 'at_bridger',
    label: 'Fort Bridger',
    description: "Jim Bridger's sparse mountain post. Tests the thin-stock variant.",
    build: () => atLandmark(baseState('bridger'), 'ft_bridger')
  },
  {
    id: 'at_hall',
    label: 'Fort Hall',
    description: "HBC post on the Snake. California Trail split. Tests buyable jerky + salt.",
    build: () => atLandmark(baseState('hall'), 'ft_hall')
  },
  {
    id: 'at_dalles',
    label: 'The Dalles',
    description: 'End-of-trail gorge town — luxury post, ruinous prices.',
    build: () => atLandmark(baseState('dalles'), 'the_dalles')
  },
  {
    id: 'low_food',
    label: 'Low on food',
    description: 'At Fort Kearny with 3 days of food left. Tests food-summary warning + starvation.',
    build: () => {
      let s = atLandmark(baseState('low_food'), 'ft_kearny');
      // Wipe the pantry, leave ~3 adult-days of rations.
      s = setInventory(s, {
        flour: 3, beans: 3, bacon: 0, hardtack: 0, dried_fruit: 0,
        pemmican: 0, jerky: 0, sugar: 0, coffee: 0, tea: 0
      });
      return s;
    }
  },
  {
    id: 'post_hunt_haul',
    label: 'Post-hunt haul (big game)',
    description: 'On the trail with a fresh big-game haul flagged — opens PostHuntModal on load.',
    build: () => {
      let s = baseState('post_hunt_haul');
      // A few days in so the log has something and travel feels mid-journey.
      s = atLandmark(s, 'ft_kearny');
      s = { ...s, location: { ...s.location, atLandmarkId: null } };
      s = setInventory(s, {
        game_meat: 180,
        berries: 6,
        bullets: 18
      });
      const haul: HuntHaul = {
        target: 'big',
        meat: 180,
        berries: 6,
        liver: true,
        bullets: 20,
        injured: null,
        spoilDay: computeSpoilDay(s.day)
      };
      s = setFlags(s, {
        _huntHaul: haul as unknown as Record<string, unknown>,
        _gameMeatSpoilDay: computeSpoilDay(s.day)
      });
      return s;
    }
  },
  {
    id: 'injured_member',
    label: 'Injured party member',
    description: 'At Kansas River with Ellen suffering a broken leg. Tests party modal + ford risk.',
    build: () => {
      let s = atLandmark(baseState('injured'), 'kansas_river');
      s = giveCondition(s, 1, 'broken_leg');
      // Bring her health down a bit to make the condition visible.
      s = {
        ...s,
        party: s.party.map((m, i) =>
          i === 1 ? { ...m, health: 60 } : m
        )
      };
      return s;
    }
  },
  {
    id: 'with_dog',
    label: 'With a dog',
    description: 'Starter party at Fort Kearny with a dog named Shep — hunt bonus + daily morale +1.',
    build: () => {
      const base = atLandmark(baseState('dog'), 'ft_kearny');
      return { ...base, dog: { name: 'Shep' } };
    }
  },
  {
    id: 'abandoned_hall_1857',
    label: 'Fort Hall (abandoned, 1857)',
    description: 'Party arrives at Fort Hall in 1857 — HBC has left. Empty stockade, no trade, no Visit.',
    build: () => {
      let s = createInitialState({
        seed: 'abandoned-hall',
        leader: { name: 'Dave', profession: 'farmer', sex: 'male' },
        companions: [
          { name: 'Ellen',  profession: 'doctor',  sex: 'female' },
          { name: 'Samuel', profession: 'hunter',  sex: 'male' }
        ],
        // 1857: a year after HBC abandoned the post.
        startDate: { year: 1857, month: 4, day: 15 }
      });
      s = atLandmark(s, 'ft_hall');
      return s;
    }
  },
  {
    id: 'near_end',
    label: 'Near the end',
    description: 'At Blue Mountains — one landmark from The Dalles, thin supplies, high fatigue.',
    build: () => {
      let s = atLandmark(baseState('near_end'), 'blue_mountains');
      // Realistic depletion: the wagon's been on the trail ~3 months.
      s = {
        ...s,
        wagon: { ...s.wagon, condition: 55 },
        morale: 45,
        oxen: s.oxen.map((o) => ({ ...o, fatigue: 60 }))
      };
      s = setInventory(s, {
        flour: 40, beans: 20, bacon: 10, hardtack: 15, dried_fruit: 5,
        pemmican: 8, bullets: 4, quinine: 0, bandages: 1
      });
      return s;
    }
  },
  {
    id: 'post_ford_summary',
    label: 'Post-ford receipt',
    description: 'Just forded Kansas River — opens the FordSummaryModal.',
    build: () => {
      const base = atLandmark(baseState('post_ford'), 'kansas_river');
      return ford(base, {
        method: 'ford',
        river: { depthFt: 3.0, currentMph: 2, ferryPrice: 3 }
      });
    }
  },
  {
    id: 'post_trade_receipt',
    label: 'Post-trade receipt',
    description: 'Just traded at Fort Laramie — opens the TradeReceiptModal.',
    build: () => {
      let s = atLandmark(baseState('post_trade'), 'ft_laramie');
      // Give some cash + a sell-able pile so both columns have content.
      s = { ...s, cash: 200 };
      s = setInventory(s, { ...s.inventory, bacon: 40 });
      return trade(s, {
        buys: [
          { item: 'flour', qty: 30 },
          { item: 'bullets', qty: 15 }
        ],
        sells: [{ item: 'bacon', qty: 10 }]
      });
    }
  },
  {
    id: 'post_camp_summary',
    label: 'Post-camp summary',
    description: 'Just finished a 3-day rest with whiskey + dig-well + sing-along — opens the camp reveal.',
    build: () => {
      // Set up a party that can actually run all three activities, then
      // run rest() so the summary flag is authentic (not hand-rolled).
      let s = baseState('post_camp');
      s = setInventory(s, {
        ...s.inventory,
        whiskey: 2, harmonica: 1, shovel: 1
      });
      // Bring morale and ox fatigue somewhere mid-range so the deltas
      // in the modal read as meaningful.
      s = {
        ...s,
        morale: 45,
        oxen: s.oxen.map((o) => ({ ...o, fatigue: 55 })),
        party: s.party.map((m, i) => i === 1 ? { ...m, health: 70 } : m)
      };
      return rest(s, 3, { campActions: ['pass_whiskey', 'dig_well', 'sing_along'] });
    }
  }
];

/** Look up a scenario by id. Returns null if unknown. */
export function getScenario(id: string): Scenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
