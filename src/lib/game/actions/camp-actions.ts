import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLivePreacher } from '../professions/predicates';

// Camp actions are one-shot activities the party can do during a rest
// day (applied on day 1 of the rest, same as shovel actions). Each has
// an hour cost that shares the 12-hour daily budget with shovel actions.
//
// Adding a new action = one entry in `CAMP_ACTIONS` with `availability`
// and `apply`. The RestModal renders them as a multi-select grid;
// rest.ts applies each picked action's effect after the day's
// morale/consumption/healing but before death reap.

export interface CampActionAvailability {
  available: boolean;
  reason?: string;
}

export interface CampAction {
  id: CampActionId;
  label: string;
  sub: string;
  icon: string;
  hourCost: number;
  availability: (state: GameState) => CampActionAvailability;
  apply: (state: GameState, rng: Rng) => GameState;
}

export type CampActionId =
  | 'pass_whiskey'
  | 'big_meal'
  | 'sing_along'
  | 'read_bible'
  | 'cure_meat'
  | 'dig_well'
  | 'dig_grave'
  | 'dig_out';

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

function aliveAdults(s: GameState): number {
  return s.party.filter((m) => !m.dead && m.kind === 'adult').length;
}

function totalFoodLb(s: GameState): number {
  // Sum of the primary food items (excludes coffee/tea, which aren't
  // "meals"). Used only for the big-meal gating.
  const ids = ['game_meat', 'berries', 'flour', 'beans', 'bacon', 'jerky', 'hardtack', 'dried_fruit', 'pemmican'];
  return ids.reduce((sum, id) => sum + (s.inventory[id] ?? 0), 0);
}

// --- Actions ---

const passWhiskey: CampAction = {
  id: 'pass_whiskey',
  label: 'Pass the whiskey',
  sub: '−1 whiskey · +3 morale · small chance of squabble',
  icon: '🥃',
  hourCost: 1,
  availability: (s) =>
    (s.inventory.whiskey ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need whiskey' },
  apply: (s, rng) => {
    const next: Record<string, number> = {
      ...s.inventory,
      whiskey: (s.inventory.whiskey ?? 0) - 1
    };
    // 15% chance a drunk squabble erupts — net −1 morale instead of +3.
    const squabble = rng.chance(0.15);
    const delta = squabble ? -1 : 3;
    const line = squabble
      ? 'Whiskey turned into a shouting match — morale −1.'
      : 'The bottle went around the fire. Spirits lifted — morale +3.';
    return logLine(
      { ...s, inventory: next, morale: Math.max(0, Math.min(100, s.morale + delta)) },
      line
    );
  }
};

const bigMeal: CampAction = {
  id: 'big_meal',
  label: 'Cook a big meal',
  sub: '−4 lb food · +4 morale · +2 health',
  icon: '🍲',
  hourCost: 2,
  availability: (s) =>
    totalFoodLb(s) >= 8
      ? { available: true }
      : { available: false, reason: 'Need at least 8 lb of food' },
  apply: (s) => {
    // Consume 4 lb of food on top of daily rations, drawing from the
    // heaviest piles first so precious pemmican/jerky is spared.
    const order = ['flour', 'beans', 'bacon', 'hardtack', 'game_meat', 'berries', 'dried_fruit', 'jerky', 'pemmican'];
    const inventory: Record<string, number> = { ...s.inventory };
    let remaining = 4;
    for (const id of order) {
      if (remaining <= 0) break;
      const have = inventory[id] ?? 0;
      const take = Math.min(have, remaining);
      if (take > 0) {
        inventory[id] = have - take;
        remaining -= take;
      }
    }
    return logLine(
      {
        ...s,
        inventory,
        morale: Math.min(100, s.morale + 4),
        party: s.party.map((m) =>
          !m.dead && m.kind === 'adult'
            ? { ...m, health: Math.min(100, m.health + 2) }
            : m
        )
      },
      'Cooked a big meal — biscuits, stew, hot coffee. Morale +4, health +2.'
    );
  }
};

const singAlong: CampAction = {
  id: 'sing_along',
  label: 'Campfire sing-along',
  sub: 'Harmonica or fiddle · +3 morale (+5 fiddle, +2 preacher)',
  icon: '🎻',
  hourCost: 2,
  availability: (s) => {
    const hasHarmonica = (s.inventory.harmonica ?? 0) > 0;
    const hasFiddle = (s.inventory.fiddle ?? 0) > 0;
    return hasHarmonica || hasFiddle
      ? { available: true }
      : { available: false, reason: 'Need harmonica or fiddle' };
  },
  apply: (s) => {
    const hasFiddle = (s.inventory.fiddle ?? 0) > 0;
    let delta = hasFiddle ? 5 : 3;
    const preacherBump = hasLivePreacher(s);
    if (preacherBump) delta += 2;
    const instrument = hasFiddle ? 'fiddle' : 'harmonica';
    const preacherLine = preacherBump ? ' The Preacher led hymns.' : '';
    return logLine(
      { ...s, morale: Math.min(100, s.morale + delta) },
      `A ${instrument} sing-along by the fire.${preacherLine} Morale +${delta}.`
    );
  }
};

const readBible: CampAction = {
  id: 'read_bible',
  label: 'Read the Bible',
  sub: 'Bible · +2 morale (+4 with Preacher)',
  icon: '📖',
  hourCost: 1,
  availability: (s) =>
    (s.inventory.bible ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a Bible' },
  apply: (s) => {
    const delta = hasLivePreacher(s) ? 4 : 2;
    const line = hasLivePreacher(s)
      ? `The Preacher read scripture over supper. A settling presence — morale +${delta}.`
      : `Someone read a psalm aloud before bed. The camp quieted — morale +${delta}.`;
    return logLine({ ...s, morale: Math.min(100, s.morale + delta) }, line);
  }
};

const CURE_HOURS_NO_SALT = 6;
const CURE_HOURS_WITH_SALT = 4;
const CURE_RATE_NO_SALT = 0.7;
const CURE_RATE_WITH_SALT = 0.85;

const cureMeat: CampAction = {
  id: 'cure_meat',
  label: 'Cure meat into jerky',
  sub: 'Game meat → jerky · 6 hr (4 hr + 1 salt)',
  icon: '🥩',
  hourCost: CURE_HOURS_NO_SALT, // UI caveat — actual cost adapts in rest.ts
  availability: (s) =>
    (s.inventory.game_meat ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need fresh game meat' },
  apply: (s) => {
    const meat = s.inventory.game_meat ?? 0;
    if (meat <= 0) return s;
    const hasSalt = (s.inventory.salt ?? 0) > 0;
    const rate = hasSalt ? CURE_RATE_WITH_SALT : CURE_RATE_NO_SALT;
    const jerkyLbs = Math.floor(meat * rate);

    const inventory: Record<string, number> = { ...s.inventory };
    inventory.game_meat = 0;
    inventory.jerky = (inventory.jerky ?? 0) + jerkyLbs;
    if (hasSalt) inventory.salt = (inventory.salt ?? 0) - 1;

    // Cleared spoil-day flag — no fresh meat left to rot.
    const flags = { ...s.flags };
    delete (flags as Record<string, unknown>)._gameMeatSpoilDay;

    const lossLbs = meat - jerkyLbs;
    const saltLine = hasSalt ? ' with salt' : '';
    const lossLine = lossLbs > 0 ? ` (${lossLbs} lb lost to air-drying).` : '.';
    return logLine(
      { ...s, inventory, flags },
      `Cured ${meat} lb of game meat${saltLine} into ${jerkyLbs} lb of jerky${lossLine}`
    );
  }
};

// --- Shovel-work actions ---
// Previously lived in rest.ts under a separate `ShovelAction` type; folded
// into the unified camp-actions registry so the budget check, UI grid, and
// form parsing are a single code path.

const WELL_WATER_GAL_MIN = 30;
const WELL_WATER_GAL_MAX = 50;
const WELL_SUCCESS_CHANCE = 0.4;

const digWell: CampAction = {
  id: 'dig_well',
  label: 'Dig a well',
  sub: 'Shovel · 5 hr · 40% chance to find water',
  icon: '🪣',
  hourCost: 5,
  availability: (s) =>
    (s.inventory.shovel ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a shovel' },
  apply: (s, rng) => {
    if (rng.chance(WELL_SUCCESS_CHANCE)) {
      const gal = rng.int(WELL_WATER_GAL_MIN, WELL_WATER_GAL_MAX);
      return logLine(
        {
          ...s,
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + gal)
          }
        },
        `Dug a well and found ${gal} gallons of water.`
      );
    }
    return logLine(s, 'Dug a well — came up dry.');
  }
};

const digGrave: CampAction = {
  id: 'dig_grave',
  label: 'Dig a grave',
  sub: 'Shovel · 2 hr · prepared in advance',
  icon: '⚰️',
  hourCost: 2,
  availability: (s) =>
    (s.inventory.shovel ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a shovel' },
  apply: (s) => logLine(s, 'Dug a grave in advance.')
};

const digOut: CampAction = {
  id: 'dig_out',
  label: 'Dig out the wagon',
  sub: 'Shovel · 4 hr · free stuck wheels',
  icon: '⛏️',
  hourCost: 4,
  availability: (s) =>
    (s.inventory.shovel ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a shovel' },
  apply: (s) => logLine(s, 'Dug out of mud/snow.')
};

/** Registry — order controls UI render order in RestModal. */
export const CAMP_ACTIONS: readonly CampAction[] = [
  // Morale / comfort
  passWhiskey,
  bigMeal,
  singAlong,
  readBible,
  // Preservation
  cureMeat,
  // Shovel work (gated on having a shovel)
  digWell,
  digGrave,
  digOut
];

export const CAMP_ACTIONS_BY_ID: Record<CampActionId, CampAction> = {
  pass_whiskey: passWhiskey,
  big_meal: bigMeal,
  sing_along: singAlong,
  read_bible: readBible,
  cure_meat: cureMeat,
  dig_well: digWell,
  dig_grave: digGrave,
  dig_out: digOut
};

export function getCampAction(id: CampActionId): CampAction {
  const a = CAMP_ACTIONS_BY_ID[id];
  if (!a) throw new Error(`Unknown camp action: ${id}`);
  return a;
}

/**
 * Dynamic hour cost — only cureMeat adjusts based on salt. Kept as a
 * function so other actions can grow this dimension later (e.g. big
 * meal faster with cookware, sing-along shorter with just a harmonica).
 */
export function hourCostFor(action: CampAction, state: GameState): number {
  if (action.id === 'cure_meat') {
    return (state.inventory.salt ?? 0) > 0 ? CURE_HOURS_WITH_SALT : CURE_HOURS_NO_SALT;
  }
  return action.hourCost;
}
