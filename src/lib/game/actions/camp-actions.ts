import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLivePreacher, hasLiveWhore } from '../professions/predicates';
import { canBoilWater } from '../systems/water-purity';

// Camp actions are one-shot activities the party can do during a rest
// day (applied on day 1 of the rest, same as shovel actions). Each has
// an hour cost that shares the 12-hour daily budget with shovel actions.
//
// Adding a new action = one entry in `CAMP_ACTIONS` with `availability`
// and `apply`. The CampStage renders them as a multi-select grid;
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
  /** When true, the camp grid omits this action entirely. Used for
   *  desperation actions (e.g. cannibalism) that should stay invisible
   *  until conditions arise. Defaults to never-hidden. */
  hidden?: (state: GameState) => boolean;
}

export type CampActionId =
  | 'pass_whiskey'
  | 'big_meal'
  | 'sing_along'
  | 'read_bible'
  | 'share_the_whore'
  | 'cure_meat'
  | 'find_water'
  | 'boil_water'
  | 'dig_well'
  | 'dig_grave'
  | 'dig_out'
  | 'gather_firewood'
  | 'cannibalism_corpse'
  | 'cannibalism_straws';

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
  sub: 'Bible · 2 hr · +2 morale (+4 with Preacher)',
  icon: '📖',
  hourCost: 2,
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

// Replaces the old passive Whore +1/male/night. One-shot per camp;
// the punchier per-use yield (+2/male) lines up roughly with what a
// 1-2 night rest gave previously, while putting it in the player's
// hands as an explicit choice. A small chance of jealousy turns the
// night sour — period-flavored squabble, not a hard punishment.
const shareTheWhore: CampAction = {
  id: 'share_the_whore',
  label: 'Share the Whore',
  sub: 'Whore · 2 hr · +2 morale per adult male',
  icon: '💋',
  hourCost: 2,
  availability: (s) => {
    if (!hasLiveWhore(s)) return { available: false, reason: 'No Whore in the party' };
    const males = s.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length;
    if (males <= 0) return { available: false, reason: 'No adult men to take a turn' };
    return { available: true };
  },
  apply: (s, rng) => {
    const males = s.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length;
    const whore = s.party.find((m) => !m.dead && m.profession === 'whore');
    const name = whore?.name ?? 'The Whore';
    // 12% chance jealousy / argument breaks out — net -2 morale instead.
    if (rng.chance(0.12)) {
      return logLine(
        { ...s, morale: Math.max(0, s.morale - 2) },
        `Tempers flared when ${name}'s line got long. The night soured — morale −2.`
      );
    }
    const delta = males * 2;
    return logLine(
      { ...s, morale: Math.min(100, s.morale + delta) },
      `${name} entertained the men by lantern-light. Spirits high — morale +${delta}.`
    );
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
  sub: 'Shovel · 6 hr · 40% chance to find water',
  icon: '🪣',
  hourCost: 6,
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

// Firewood gathering — always available. Yield scales with terrain
// (same mean table as passive travel-day gather, but bigger because
// you're focused on it instead of walking). 3-hour slot.
const gatherFirewood: CampAction = {
  id: 'gather_firewood',
  label: 'Gather firewood',
  sub: '3 hr · terrain-dependent yield',
  icon: '🪵',
  hourCost: 3,
  availability: () => ({ available: true }),
  apply: (s, rng) => {
    // Same mean table as travel-day gather, but 2× since this is
    // focused time in one spot rather than grabbing what you pass.
    const baseByTerrain: Record<string, number> = {
      forest: 24, prairie: 12, mountains: 20, desert: 4, river: 16
    };
    const mean = baseByTerrain[s.location.terrain] ?? 10;
    const gained = rng.int(Math.round(mean * 0.7), Math.round(mean * 1.3));
    return logLine(
      {
        ...s,
        resources: {
          ...s.resources,
          firewood: (s.resources.firewood ?? 0) + gained
        }
      },
      `Gathered ${gained} lb of firewood from the ${s.location.terrain}.`
    );
  }
};

// --- Water (#106) ---
//
// `find_water` is the no-shovel cousin of dig_well: forage along
// streams, ponds, sloughs. Always returns DIRTY water — pre-1854
// players don't know it's dirty, but the disease-risk mechanic in
// consumption.ts catches them anyway. With knowledge (post-1854 OR a
// Doctor in the party), they can also boil it via boil_water.

const FIND_WATER_MIN = 12;
const FIND_WATER_MAX = 24;
const BOIL_GAL_PER_LB_FIREWOOD = 5;

const findWater: CampAction = {
  id: 'find_water',
  label: 'Find water',
  sub: '3 hr · 12-24 gal from a creek or pond',
  icon: '💧',
  hourCost: 3,
  availability: (s) => {
    const cap = s.resources.waterCap;
    const total = s.resources.water + (s.resources.dirtyWater ?? 0);
    return total >= cap
      ? { available: false, reason: 'Water kegs are full' }
      : { available: true };
  },
  apply: (s, rng) => {
    const cap = s.resources.waterCap;
    const total = s.resources.water + (s.resources.dirtyWater ?? 0);
    const room = Math.max(0, cap - total);
    if (room === 0) return s;
    const drawn = Math.min(room, rng.int(FIND_WATER_MIN, FIND_WATER_MAX));
    // Find returns dirty water — players who can perceive the
    // distinction will see the dirtyWater pool grow; pre-knowledge
    // players just see total water rise.
    const knowsBoiling = canBoilWater(s);
    const next: GameState = {
      ...s,
      resources: {
        ...s.resources,
        dirtyWater: (s.resources.dirtyWater ?? 0) + drawn
      }
    };
    const line = knowsBoiling
      ? `Found ${drawn} gal of water — looks suspect. Boil before drinking.`
      : `Found ${drawn} gal of water from a nearby stream.`;
    return logLine(next, line);
  }
};

const boilWater: CampAction = {
  id: 'boil_water',
  label: 'Boil water',
  sub: '2 hr · 1 lb firewood per 5 gal · purifies dirty water',
  icon: '🔥',
  hourCost: 2,
  hidden: (s) => !canBoilWater(s), // pre-knowledge parties don't see this option
  availability: (s) => {
    if (!canBoilWater(s)) {
      return { available: false, reason: 'Need a doctor in the party or post-1854 knowledge' };
    }
    const dirty = s.resources.dirtyWater ?? 0;
    if (dirty <= 0) return { available: false, reason: 'No dirty water to boil' };
    if ((s.resources.firewood ?? 0) < 1) return { available: false, reason: 'Need firewood for the fire' };
    return { available: true };
  },
  apply: (s) => {
    const dirty = s.resources.dirtyWater ?? 0;
    if (dirty <= 0) return s;
    const firewood = s.resources.firewood ?? 0;
    if (firewood < 1) return s;
    // Boil up to (firewood × 5) gal, capped at remaining clean room and dirty on hand.
    const cleanRoom = Math.max(0, s.resources.waterCap - s.resources.water);
    const max = Math.min(dirty, cleanRoom, firewood * BOIL_GAL_PER_LB_FIREWOOD);
    if (max <= 0) return s;
    const woodUsed = Math.ceil(max / BOIL_GAL_PER_LB_FIREWOOD);
    return logLine(
      {
        ...s,
        resources: {
          ...s.resources,
          water: s.resources.water + max,
          dirtyWater: dirty - max,
          firewood: firewood - woodUsed
        }
      },
      `Boiled ${max} gal of water clean — burned ${woodUsed} lb firewood.`
    );
  }
};

// --- Cannibalism (desperation) ---

/** True if the party has nothing left to eat. */
function hasNoFood(state: GameState): boolean {
  return totalFoodLb(state) === 0;
}

/** Recently-deceased adult still with the party — eligible to be eaten.
 *  Not 'consumed' yet. Window of 5 days so very-old corpses don't apply. */
function recentCorpse(state: GameState): GameState['party'][number] | null {
  const fresh = state.party.filter((m) =>
    m.dead
    && m.kind === 'adult'
    && !m.consumed
    && typeof m.deathDay === 'number'
    && state.day - m.deathDay <= 5
  );
  if (fresh.length === 0) return null;
  // Most-recent first.
  return fresh.sort((a, b) => (b.deathDay ?? 0) - (a.deathDay ?? 0))[0];
}

/** Lowest-HP alive adult — the one drawn-straws would target (or volunteer). */
function weakestAdult(state: GameState): GameState['party'][number] | null {
  const alive = state.party.filter((m) => !m.dead && m.kind === 'adult');
  if (alive.length === 0) return null;
  return alive.sort((a, b) => a.health - b.health)[0];
}

/** Bumps the cannibalism-guilt counter on flags. The morale system can
 *  read this for a recurrent malus later (#149 follow-up). */
function bumpGuilt(state: GameState, weight: number): GameState {
  const prev = (state.flags._cannibalismCount as number | undefined) ?? 0;
  return {
    ...state,
    flags: { ...state.flags, _cannibalismCount: prev + weight }
  };
}

const cannibalism_corpse: CampAction = {
  id: 'cannibalism_corpse',
  label: 'Eat the dead',
  sub: 'Recently fallen kin · 6 hr · grim, but better than dying',
  icon: '🪦',
  hourCost: 6,
  hidden: (s) => !(hasNoFood(s) && recentCorpse(s) !== null),
  availability: (s) =>
    hasNoFood(s) && recentCorpse(s) !== null
      ? { available: true }
      : { available: false, reason: 'Only when starving and a body remains.' },
  apply: (s) => {
    const corpse = recentCorpse(s);
    if (!corpse) return s; // hidden gate should prevent this
    const meatLbs = 50;
    // Clear pending burial — the body is being handled, not buried.
    const flags = { ...s.flags };
    delete (flags as Record<string, unknown>)._burialPending;
    let next: GameState = {
      ...s,
      flags,
      party: s.party.map((m) =>
        m.id === corpse.id ? { ...m, consumed: true } : m
      ),
      inventory: { ...s.inventory, game_meat: (s.inventory.game_meat ?? 0) + meatLbs },
      morale: Math.max(0, s.morale - 18)
    };
    next = bumpGuilt(next, 1);
    return logLine(
      next,
      `Took ${corpse.name}'s body for meat — ${meatLbs} lb of fresh game. Nobody spoke. Morale -18.`
    );
  }
};

const cannibalism_straws: CampAction = {
  id: 'cannibalism_straws',
  label: 'Draw straws',
  sub: 'No corpse, no food · 8 hr · the unthinkable',
  icon: '🩸',
  hourCost: 8,
  hidden: (s) => {
    const aliveAdultCount = s.party.filter((m) => !m.dead && m.kind === 'adult').length;
    return !(hasNoFood(s) && recentCorpse(s) === null && aliveAdultCount >= 2);
  },
  availability: (s) => {
    const aliveAdultCount = s.party.filter((m) => !m.dead && m.kind === 'adult').length;
    if (!hasNoFood(s)) return { available: false, reason: 'Only when out of food.' };
    if (recentCorpse(s) !== null) return { available: false, reason: 'A body is already at hand.' };
    if (aliveAdultCount < 2) return { available: false, reason: 'Need at least two adults to draw straws.' };
    return { available: true };
  },
  apply: (s) => {
    const victim = weakestAdult(s);
    if (!victim) return s;
    const meatLbs = 60;
    // The victim is consumed in-place — no burial event for them.
    let next: GameState = {
      ...s,
      party: s.party.map((m) =>
        m.id === victim.id
          ? {
              ...m,
              dead: true,
              consumed: true,
              health: 0,
              deathCause: 'Drew the short straw',
              deathDay: s.day
            }
          : m
      ),
      inventory: { ...s.inventory, game_meat: (s.inventory.game_meat ?? 0) + meatLbs },
      morale: Math.max(0, s.morale - 35)
    };
    next = bumpGuilt(next, 3);
    return logLine(
      next,
      `Drew straws. ${victim.name} drew the short one. ${meatLbs} lb meat. The party cannot look at one another. Morale -35.`
    );
  }
};

/** Registry — order controls UI render order in CampStage. */
export const CAMP_ACTIONS: readonly CampAction[] = [
  // Morale / comfort
  passWhiskey,
  bigMeal,
  singAlong,
  readBible,
  shareTheWhore,
  // Preservation
  cureMeat,
  // Practical
  gatherFirewood,
  findWater,
  boilWater,
  // Shovel work (gated on having a shovel)
  digWell,
  digGrave,
  digOut,
  // Desperation — hidden until starvation
  cannibalism_corpse,
  cannibalism_straws
];

export const CAMP_ACTIONS_BY_ID: Record<CampActionId, CampAction> = {
  pass_whiskey: passWhiskey,
  big_meal: bigMeal,
  sing_along: singAlong,
  read_bible: readBible,
  share_the_whore: shareTheWhore,
  cure_meat: cureMeat,
  gather_firewood: gatherFirewood,
  find_water: findWater,
  boil_water: boilWater,
  dig_well: digWell,
  dig_grave: digGrave,
  dig_out: digOut,
  cannibalism_corpse,
  cannibalism_straws
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
