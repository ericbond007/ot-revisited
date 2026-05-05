// #306 — random item-loss helpers. Period reality: emigrant diaries
// catalog at least seven distinct loss vectors (river fords, storms,
// buffalo stampedes, wagon fires, mud abandonment, theft, and rough-
// terrain shedding). This module ships the shared math; specific
// trigger sources live in their event/action files.
//
// **Phase 1**: buffalo stampede (Marcy 1859) — cookware / tinware crush.
// **Phase 2** (this iteration): ford catastrophe (Sager 1844 / Carpenter
// 1857 / Frizzell 1852), wind-loss on storms (Bryant 1846), stuck-in-mud
// player-choice abandonment (Joel Palmer 1845), daily theft (Bryant
// 1846 / Hancock 1852, with #176 train share-watch reducing per Bryant).
// **Phase 3** (logged in #306 TODO): wagon fire (Sage 1846), rough-
// terrain shed (Frizzell at Hall).

import type { GameState, NpcWagonState } from '../types';
import type { Rng } from '../rng';

/** Items the buffalo stampede smashes — period: cast-iron cookware, tin
 *  butter-crocks, cheese-press wood/iron rigs, basically anything left
 *  out at camp. Marcy 1859 says "in the wagon" was safe; "outside" was
 *  fair game. We keep the list narrow so the loss is identifiable. */
export const STAMPEDE_VICTIMS = [
  'cookware',
  'butter_crock',
  'cheese_press'
] as const;

/** Per-item loss fraction on stampede — half of stack rounds DOWN to
 *  the nearest unit, so 1 unit gets fully crushed, 2 units lose 1, 3
 *  lose 1, 4 lose 2, etc. Period: a stampede took what it took; few
 *  diaries report partial losses. */
export const STAMPEDE_LOSS_FRACTION = 0.5;

export interface StampedeDamageResult {
  /** Items lost (id → qty) so the caller can craft a single log line. */
  losses: Record<string, number>;
}

/** Apply stampede damage to an inventory. Pure function — caller
 *  composes the new state. Used by both player event apply and the
 *  NPC train-wide propagation. */
export function rollStampedeLosses(
  inventory: Record<string, number>,
  rng: Rng
): { inventory: Record<string, number>; result: StampedeDamageResult } {
  const next = { ...inventory };
  const losses: Record<string, number> = {};
  for (const item of STAMPEDE_VICTIMS) {
    const have = next[item] ?? 0;
    if (have <= 0) continue;
    // Always lose at least 1 if any present (period: stampedes were
    // catastrophic, not gentle). RNG drives whether the loss is
    // half-rounded-down or half-rounded-up for stacks of 2+.
    const baseLoss = Math.max(1, Math.floor(have * STAMPEDE_LOSS_FRACTION));
    const jitter = have >= 2 && rng.chance(0.5) ? 1 : 0;
    const loss = Math.min(have, baseLoss + jitter);
    next[item] = have - loss;
    losses[item] = loss;
  }
  return { inventory: next, result: { losses } };
}

/** Probability the stampede actually inflicts crushed-tinware damage
 *  when the event fires. The other 30% is a near-miss — period: many
 *  diaries describe herds veering at the last second when wagons
 *  banged pots or fired warning shots. Keeps the event dramatic
 *  without making it deterministic. */
export const STAMPEDE_HIT_CHANCE = 0.7;

/** Apply stampede damage to the player's wagon. Returns new state
 *  with morale/inventory updated and a log line summarizing losses.
 *  30% of the time the stampede fires but veers off — only a morale
 *  scare, no crush. Caller (the event apply fn) composes any
 *  additional effects. */
export function applyStampedeToPlayer(
  state: GameState,
  rng: Rng
): GameState {
  const hits = rng.chance(STAMPEDE_HIT_CHANCE);
  if (!hits) {
    return {
      ...state,
      morale: Math.max(0, state.morale - 1),
      eventLog: [
        ...state.eventLog,
        { day: state.day, text: 'Buffalo herd thundered past. Pots banged, shots fired — they veered at the last second. Morale −1.' }
      ]
    };
  }
  const { inventory, result } = rollStampedeLosses(state.inventory, rng);
  const lostItems = Object.entries(result.losses);
  const summary = lostItems.length === 0
    ? 'No tinware was outside the wagon — nothing crushed.'
    : `${lostItems.map(([id, qty]) => `${qty} ${id.replace(/_/g, ' ')}`).join(' + ')} crushed under hooves.`;
  return {
    ...state,
    inventory,
    morale: Math.max(0, state.morale - 3),
    eventLog: [
      ...state.eventLog,
      { day: state.day, text: `Buffalo stampede tore through camp. ${summary} Morale −3.` }
    ]
  };
}

/** Apply stampede damage to a single NPC wagon. Period: a stampede
 *  through an in-train camp hit every wagon, not just the player's.
 *  Returns the updated wagon + a player-visible log fragment for the
 *  bubble-up news on the player's eventLog. */
export function applyStampedeToNpc(
  wagon: NpcWagonState,
  rng: Rng,
  day: number
): { wagon: NpcWagonState; playerLog: string | null } {
  if (wagon.outcome !== 'in-progress') {
    return { wagon, playerLog: null };
  }
  // Independent hit/miss roll per wagon — period: some wagons got
  // crushed, some saw the herd pass them at the last second. Each
  // wagon's experience varied.
  if (!rng.chance(STAMPEDE_HIT_CHANCE)) {
    return {
      wagon: {
        ...wagon,
        morale: Math.max(0, wagon.morale - 1),
        eventLog: [
          ...wagon.eventLog,
          { day, text: 'Buffalo herd veered past — close call. Morale −1.' }
        ]
      },
      playerLog: null
    };
  }
  const { inventory, result } = rollStampedeLosses(wagon.inventory, rng);
  const lostItems = Object.entries(result.losses);
  if (lostItems.length === 0) {
    return { wagon, playerLog: null };
  }
  const summary = lostItems
    .map(([id, qty]) => `${qty} ${id.replace(/_/g, ' ')}`)
    .join(' + ');
  return {
    wagon: {
      ...wagon,
      inventory,
      morale: Math.max(0, wagon.morale - 3),
      eventLog: [
        ...wagon.eventLog,
        { day, text: `Buffalo stampede crushed ${summary} in camp. Morale −3.` }
      ]
    },
    playerLog: `${wagon.name} lost ${summary} in the stampede.`
  };
}

// --- #306 phase 2 — ford catastrophe (Sager 1844, Carpenter 1857, Frizzell 1852) ---

/** Items the river takes when a ford goes wrong: heavy goods that
 *  weren't lashed to the wagon bed. Cookware (cast iron sinks), trade
 *  goods that were lashed loose, comfort heirlooms a family kept in a
 *  trunk. Period diaries: Sager 1844 lost a trunk in the Snake;
 *  Carpenter 1857 lost barrels at Green River; Frizzell 1852 records
 *  oxen knocking a chest off the raft at the Platte. */
export const FORD_VICTIMS = [
  'cookware',
  'butter_crock',
  'cheese_press',
  'flour',
  'beans',
  'sugar',
  'saleratus',
  'china_tea_set',
  'feather_mattress',
  'shelf_clock',
  'silver_tea_service'
] as const;

/** Catastrophic-ford item-loss roll. Triggers when the ford action's
 *  `danger` is high enough — one or two items get a partial-stack
 *  loss. Returns the new state plus the loss summary for log. */
export function rollFordLoss(
  state: GameState,
  danger: number,
  rng: Rng
): { state: GameState; lossLine: string | null } {
  // Danger ≤ 2 (calm ford) → no roll. Danger 6+ → ~30% chance, 8+ → ~50%.
  const chance = Math.min(0.5, Math.max(0, (danger - 2) * 0.075));
  if (!rng.chance(chance)) return { state, lossLine: null };

  // Pick one or two random items the river took.
  const eligible = FORD_VICTIMS.filter((id) => (state.inventory[id] ?? 0) > 0);
  if (eligible.length === 0) return { state, lossLine: null };

  const count = rng.chance(0.4) ? 2 : 1;
  const losses: { id: string; qty: number }[] = [];
  const inv = { ...state.inventory };
  for (let i = 0; i < count && eligible.length > 0; i++) {
    const idx = rng.int(0, eligible.length - 1);
    const id = eligible.splice(idx, 1)[0];
    const have = inv[id] ?? 0;
    if (have <= 0) continue;
    // Heavy stacks lose a chunk (5-15 lb / units), small stacks fully.
    const qty = have <= 3 ? have : Math.min(have, rng.int(5, 15));
    inv[id] = have - qty;
    losses.push({ id, qty });
  }
  if (losses.length === 0) return { state, lossLine: null };
  const summary = losses
    .map((l) => `${l.qty} ${l.id.replace(/_/g, ' ')}`)
    .join(' + ');
  const text = `The current took ${summary} — swept off the wagon bed.`;
  return {
    state: {
      ...state,
      inventory: inv,
      eventLog: [...state.eventLog, { day: state.day, text }]
    },
    lossLine: text
  };
}

// --- #306 phase 2 — wind-loss on storms (Bryant 1846) ---

/** Items that blow off a wagon in a storm even with the canvas intact —
 *  loose-lashed items on the bench / running gear. Distinct from #201
 *  canvas-leak which targets dry goods inside a leaky cover. */
export const WIND_VICTIMS = [
  'tent',          // tent canvas blowing off, period: Frizzell 1852
  'tar_bucket',    // common bench-side item
  'rope',          // single coil swept off
  'spare_plank',   // lashed to the side, period: Bryant 1846
  'canvas',        // canvas spare bolt (separate from wagon canvas)
  'bandages'       // small loose items
] as const;

/** 5% wind-loss roll on a storm tick (called from the storm event apply).
 *  Picks one item from WIND_VICTIMS, removes 1 unit. Returns log line. */
export function rollStormWindLoss(
  state: GameState,
  rng: Rng
): { state: GameState; lossLine: string | null } {
  if (!rng.chance(0.20)) return { state, lossLine: null };
  const eligible = WIND_VICTIMS.filter((id) => (state.inventory[id] ?? 0) > 0);
  if (eligible.length === 0) return { state, lossLine: null };
  const id = eligible[rng.int(0, eligible.length - 1)];
  const have = state.inventory[id] ?? 0;
  const text = `The wind took ${id.replace(/_/g, ' ')} off the wagon — 1 unit lost.`;
  return {
    state: {
      ...state,
      inventory: { ...state.inventory, [id]: have - 1 },
      eventLog: [...state.eventLog, { day: state.day, text }]
    },
    lossLine: text
  };
}

// --- #306 phase 2 — stuck-in-mud abandonment (Joel Palmer 1845) ---

/** Heavy non-essential items the player can drop to lighten a stuck
 *  wagon. Period: Palmer 1845 "had to leave the cookware to get the
 *  wagon out of the slough." Anvils / clocks / heavy luxuries first;
 *  cookware as last resort. Items removed in priority order until the
 *  weight target hits, OR all eligible items dropped. */
export const ABANDON_PRIORITY = [
  // Heaviest comfort luxuries first — period: emigrants dropped these
  // by the hundredweight along the trail (Marcy 1859 "lining the trail
  // with iron").
  'anvil',
  'grandfather_clock',
  'shelf_clock',
  'feather_mattress',
  'china_tea_set',
  'silver_tea_service',
  'iron_strongbox',
  'plow',
  'printing_press',
  // Heavy spare parts.
  'wheel',
  'axle',
  'tongue',
  'canvas',
  // Then food bulk if still stuck.
  'flour',
  'beans',
  'cornmeal'
] as const;

export interface AbandonResult {
  state: GameState;
  lostItems: { id: string; qty: number }[];
}

/** Drop heavy items until ~80 lb is shed (one ox-load worth — Palmer's
 *  threshold to break free). Returns the new state + an abandonment
 *  summary. Abandons in `ABANDON_PRIORITY` order, full-stack each. */
export function abandonHeavyLoad(state: GameState): AbandonResult {
  const target = 80; // lb — period: Palmer 1845 "ox-load worth"
  const inv = { ...state.inventory };
  const lost: { id: string; qty: number }[] = [];
  let shed = 0;
  for (const id of ABANDON_PRIORITY) {
    if (shed >= target) break;
    const have = inv[id] ?? 0;
    if (have <= 0) continue;
    const itemMeta = ITEM_WEIGHTS[id] ?? 1;
    inv[id] = 0;
    lost.push({ id, qty: have });
    shed += have * itemMeta;
  }
  const summary = lost.length === 0
    ? 'Nothing heavy to drop. Pried the wagon free with rope and curse words.'
    : `Abandoned ${lost.map((l) => `${l.qty} ${l.id.replace(/_/g, ' ')}`).join(', ')} — the wagon broke free.`;
  return {
    state: {
      ...state,
      inventory: inv,
      eventLog: [...state.eventLog, { day: state.day, text: summary }]
    },
    lostItems: lost
  };
}

/** Approximate weights for the abandonment math. Using rough lb/unit
 *  values that match the items.ts catalog — exact values aren't
 *  load-bearing because the threshold is just "shed enough to break
 *  free." Items not in this map default to 1 lb/unit. */
const ITEM_WEIGHTS: Record<string, number> = {
  anvil: 100,
  grandfather_clock: 60,
  shelf_clock: 8,
  feather_mattress: 25,
  china_tea_set: 15,
  silver_tea_service: 12,
  iron_strongbox: 80,
  plow: 70,
  printing_press: 200,
  wheel: 30,
  axle: 25,
  tongue: 20,
  canvas: 15,
  flour: 1,
  beans: 1,
  cornmeal: 1
};

// --- #306 phase 2 — daily theft / pilferage (Bryant 1846, Hancock 1852) ---

/** Items thieves grab — small portable, valuable. Period: Bryant 1846
 *  at Laramie ("a tin of coffee taken from our wagon"); Hancock 1852
 *  records overnight tool theft at Bridger. Trade goods + small luxuries
 *  + portable tools. */
export const THEFT_VICTIMS = [
  'coffee',
  'sugar',
  'tobacco',
  'whiskey',
  'beads',
  'mirror',
  'pocket_knife',
  'rope',
  'salt'
] as const;

/** Daily theft roll. Base 0.5% per day (rare). Halved when in a wagon
 *  train (Bryant 1846 explicit: share-watch made overnight theft "a
 *  rare grievance"). Picks one item, takes 1-3 units. Returns new
 *  state + log line. */
export function rollDailyTheft(
  state: GameState,
  rng: Rng
): { state: GameState; lossLine: string | null } {
  const baseChance = state.wagonTrain ? 0.0025 : 0.005;
  if (!rng.chance(baseChance)) return { state, lossLine: null };
  const eligible = THEFT_VICTIMS.filter((id) => (state.inventory[id] ?? 0) > 0);
  if (eligible.length === 0) return { state, lossLine: null };
  const id = eligible[rng.int(0, eligible.length - 1)];
  const have = state.inventory[id] ?? 0;
  const qty = Math.min(have, rng.int(1, 3));
  const text = `${qty} ${id.replace(/_/g, ' ')} ${qty === 1 ? 'was' : 'were'} taken from the wagon overnight.`;
  return {
    state: {
      ...state,
      inventory: { ...state.inventory, [id]: have - qty },
      morale: Math.max(0, state.morale - 1),
      eventLog: [...state.eventLog, { day: state.day, text }]
    },
    lossLine: text
  };
}
