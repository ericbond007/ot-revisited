// src/lib/game/ai/bundle.ts
//
// #927 — Per-persona camp-action bundling on rest days. Bundles fill the
// 12-hour camp budget with available actions across 5 categories
// (survival, food, maintenance, hygiene, morale), plus an optional hunt
// directive. Shared by player-bot (runner.ts) and NPC engine
// (npc-engine.ts) for parity.
//
// Spec: docs/superpowers/specs/2026-05-25-927-bundle-camp-actions-design.md
//
// Period anchor (Frizzell 1852, Bryant 1846, Marcy 1859, Sager 1844):
// emigrant rest days were full work days. Sunday was rest from TRAVEL,
// not rest from camp labor.

import type { GameState } from '../types';
import type { Rng } from '../rng';
import type { CampActionId } from '../actions/camp-actions';
import type { Persona } from './types';
import { CAMP_ACTIONS_BY_ID, hourCostFor } from '../actions/camp-actions';
import { pickHuntTarget } from './hunt';
import { isSunday } from '../utils/calendar';
import { canBoilWater } from '../systems/water-purity';

/** Mirror of rest.ts's TIME_BUDGET_HOURS. Single source of truth lives
 *  here so callers don't bypass the cap. */
export const TIME_BUDGET_HOURS = 12;

/** A rest-day hunt is half a working day. Marcy 1859 hunting parties
 *  "left at dawn and returned by mid-afternoon" — 4-6h is the period
 *  band. Pick 5h. */
export const HUNT_HOURS = 5;

/** The subset of CampActionId that bundling considers. Excludes
 *  share_the_whore (own ritual), cannibalism (starvation-only),
 *  raid_natives / take_from_train / pan_for_gold (own persona surface),
 *  dig_out (avalanche/storm-trapped). */
export type BundleableActionId =
  | 'find_water' | 'boil_water' | 'gather_firewood' | 'dig_well'             // survival
  | 'fish' | 'set_traps' | 'cure_meat' | 'press_cheese' | 'big_meal'          // food (hunt is separate via RestBundle.hunt)
  | 'patch_wagon' | 'replace_canvas' | 'replace_planks' | 'stitch_moccasins'
    | 'cast_balls' | 'service_train'                                          // maintenance
  | 'wash_clothes' | 'make_soap'                                              // hygiene
  | 'sing_along' | 'read_bible' | 'pass_whiskey' | 'teach_kids';              // morale

export const BUNDLEABLE_ACTIONS: readonly BundleableActionId[] = [
  'find_water', 'boil_water', 'gather_firewood', 'dig_well',
  'fish', 'set_traps', 'cure_meat', 'press_cheese', 'big_meal',
  'patch_wagon', 'replace_canvas', 'replace_planks', 'stitch_moccasins', 'cast_balls', 'service_train',
  'wash_clothes', 'make_soap',
  'sing_along', 'read_bible', 'pass_whiskey', 'teach_kids',
];

export interface BundleWeights {
  /** find_water, boil_water, gather_firewood, dig_well. */
  survival: number;
  /** fish, set_traps, cure_meat, press_cheese, big_meal.
   *  Also gates the hunt directive — food>0 required to bundle hunt. */
  food: number;
  /** patch_wagon, replace_canvas, replace_planks, stitch_moccasins,
   *  cast_balls, service_train. */
  maintenance: number;
  /** wash_clothes, make_soap. */
  hygiene: number;
  /** sing_along, read_bible, pass_whiskey, teach_kids. */
  morale: number;
}

export const CATEGORY_OF: Record<BundleableActionId, keyof BundleWeights> = {
  find_water: 'survival', boil_water: 'survival',
  gather_firewood: 'survival', dig_well: 'survival',
  fish: 'food', set_traps: 'food', cure_meat: 'food',
  press_cheese: 'food', big_meal: 'food',
  patch_wagon: 'maintenance', replace_canvas: 'maintenance',
  replace_planks: 'maintenance', stitch_moccasins: 'maintenance',
  cast_balls: 'maintenance', service_train: 'maintenance',
  wash_clothes: 'hygiene', make_soap: 'hygiene',
  sing_along: 'morale', read_bible: 'morale',
  pass_whiskey: 'morale', teach_kids: 'morale',
};

export interface RestBundle {
  /** Fed into rest(state, 1, { campActions }). Includes the primary first
   *  (when provided), then greedy-fill by score within remaining budget.
   *  Typed as the broad CampActionId because rest()'s campActions opt
   *  accepts the full union; entries are always a subset (BundleableActionId). */
  campActions: CampActionId[];
  /** When non-null, caller invokes hunt(state, opts) AFTER rest() completes.
   *  The 12h budget is shared: HUNT_HOURS is subtracted alongside camp
   *  action time at bundle layer. */
  hunt: { target: ReturnType<typeof pickHuntTarget>['target']; ammo: ReturnType<typeof pickHuntTarget>['ammo']; hunters: 1 | 2 } | null;
}

/** Deterministic Fisher-Yates shuffle using the given rng. Used only
 *  by chaosBundle override. */
export function shuffleRng<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 1 hunter when only 1 live adult; 2 when there's a 2nd available.
 *  Matches the existing bot pattern in runner.ts. */
export function pickHunters(state: GameState): 1 | 2 {
  const aliveAdults = state.party.filter((m) => !m.dead && m.kind === 'adult').length;
  return aliveAdults >= 2 ? 2 : 1;
}

/** Total food inventory in pounds — sums all known food item ids. */
function totalFoodLb(state: GameState): number {
  const i = state.inventory;
  return (i.flour ?? 0) + (i.beans ?? 0) + (i.bacon ?? 0) + (i.hardtack ?? 0)
    + (i.jerky ?? 0) + (i.pemmican ?? 0) + (i.game_meat ?? 0) + (i.cornmeal ?? 0)
    + (i.cheese ?? 0) + (i.butter ?? 0) + (i.dried_fruit ?? 0) + (i.berries ?? 0);
}

/** Per-action urgency score in [0..10]. Multiplied by weights[category]
 *  to rank candidates for greedy fill. Constants are starting points —
 *  sweep-tunable.
 *
 *  An urgency of 0 always loses (gets filtered out at the algorithm
 *  layer), so urgency() can also encode soft availability gates beyond
 *  the action's own availability() check. */
export function urgency(state: GameState, id: BundleableActionId): number {
  switch (id) {
    case 'find_water': {
      const w = state.resources.water ?? 0;
      // Tightened: only urgent at critical-low (<5 gal); otherwise primary
      // selection still pulls it in when triggered upstream by ratio<0.6.
      return w < 5 ? 10 : w < 10 ? 5 : 0;
    }
    case 'boil_water': {
      const dirty = state.resources.dirtyWater ?? 0;
      return dirty > 0 ? 8 : 0;
    }
    case 'gather_firewood': {
      const fw = state.resources.firewood ?? 0;
      // Tightened: gather only when truly low; matches restWithWaterChain
      // gating which only piggybacked at fw<5.
      return fw < 5 ? 10 : 0;
    }
    case 'dig_well': {
      const w = state.resources.water ?? 0;
      const isDesert = state.location.terrain === 'desert';
      const hasShovel = (state.inventory.shovel ?? 0) > 0;
      return isDesert && hasShovel && w < 5 ? 10 : 0;
    }
    case 'fish':
    case 'set_traps': {
      const food = totalFoodLb(state);
      return food < 50 ? 8 : 4;
    }
    case 'cure_meat': {
      const meat = state.inventory.game_meat ?? 0;
      return meat >= 20 ? 10 : meat > 0 ? 5 : 0;
    }
    case 'press_cheese':
      return (state.inventory.milk ?? 0) > 0 ? 8 : 0;
    case 'big_meal':
      return state.morale < 50 ? 6 : 3;
    case 'patch_wagon': {
      const c = state.wagon.condition;
      return c < 60 ? 10 : c < 80 ? 6 : 2;
    }
    case 'replace_canvas':
      return state.wagon.canvas < 60 ? 10 : 0;
    case 'replace_planks':
      return state.wagon.condition < 50 ? 10 : 0;
    case 'stitch_moccasins':
      return (state.inventory.hide ?? 0) > 0 ? 6 : 3;
    case 'cast_balls': {
      const balls = state.inventory.lead_balls ?? 0;
      const hasMats = (state.inventory.lead ?? 0) > 0
        && (state.inventory.gunpowder ?? 0) > 0;
      return hasMats && balls < 20 ? 8 : hasMats ? 3 : 0;
    }
    case 'service_train':
      return 5;
    case 'wash_clothes':
      return state.location.terrain === 'river' ? 6 : 0;
    case 'make_soap':
      return (state.inventory.tallow ?? 0) > 0 ? 5 : 0;
    case 'sing_along':
      return state.morale < 50 ? 6 : 3;
    case 'read_bible':
      return state.morale < 60 ? 5 : 2;
    case 'pass_whiskey':
      return state.morale < 50 ? 5 : 2;
    case 'teach_kids':
      return state.party.some((m) => !m.dead && m.kind === 'child') ? 5 : 0;
  }
}

/** Signature for persona.shouldHunt — the algorithm consumes this
 *  without needing the full Persona type. */
type ShouldHuntFn = (state: GameState, rng: Rng) => boolean;

/** Default greedy-fill algorithm.
 *
 *  Signature takes (weights, shouldHunt) instead of (persona) so:
 *    1. bundle.ts doesn't import Persona at value-level (just type-level
 *       in the dispatcher), keeping the import graph one-way.
 *    2. The faithful override can swap in different weights without
 *       constructing a wrapper persona object.
 */
export function defaultBundleCampActions(
  state: GameState,
  primary: CampActionId | null,
  weights: BundleWeights,
  shouldHunt: ShouldHuntFn,
  rng: Rng,
): RestBundle {
  // 1. Score every bundleable: filter by availability AND weight>0 AND urgency>0.
  const candidates = BUNDLEABLE_ACTIONS
    .filter((id) => CAMP_ACTIONS_BY_ID[id].availability(state).available)
    .filter((id) => weights[CATEGORY_OF[id]] > 0)
    .map((id) => ({
      id,
      hours: hourCostFor(CAMP_ACTIONS_BY_ID[id], state),
      score: weights[CATEGORY_OF[id]] * urgency(state, id),
    }))
    .filter((c) => c.score > 0);

  // 2. Pick the seed: explicit primary wins; otherwise highest score.
  let seed: CampActionId | null = primary;
  if (!seed) {
    const top = [...candidates].sort((a, b) => b.score - a.score)[0];
    seed = top?.id ?? null;
  }
  const campActions: CampActionId[] = [];
  let remaining = TIME_BUDGET_HOURS;
  if (seed) {
    const seedAction = CAMP_ACTIONS_BY_ID[seed];
    // Defensive: if a caller-supplied primary is unavailable here, skip it.
    // (rest() would throw on apply; the bot driver's fallback chain catches.)
    if (seedAction.availability(state).available) {
      campActions.push(seed);
      remaining -= hourCostFor(seedAction, state);
    } else {
      seed = null;
    }
  }

  // 3. Greedy fill: sort remaining by score desc, then hours asc, then id asc.
  const restCandidates = candidates
    .filter((c) => c.id !== seed)
    .sort((a, b) =>
      (b.score - a.score) || (a.hours - b.hours) || a.id.localeCompare(b.id));
  for (const c of restCandidates) {
    if (c.hours <= remaining) {
      campActions.push(c.id);
      remaining -= c.hours;
    }
  }

  // 3b. If find_water is in the bundle and we can boil, auto-pair
  //     boil_water so dirty water from non-river terrain gets cleaned
  //     on the same rest day (matches restWithWaterChain semantics).
  //     Without this, sickness cascade from dirty water tanks arrival.
  if (campActions.includes('find_water')
      && !campActions.includes('boil_water')
      && canBoilWater(state)
      && CAMP_ACTIONS_BY_ID.boil_water.availability(state).available) {
    const boilHours = hourCostFor(CAMP_ACTIONS_BY_ID.boil_water, state);
    if (boilHours <= remaining) {
      campActions.push('boil_water');
      remaining -= boilHours;
    }
  }

  // 4. Hunt: if persona.shouldHunt and enough budget remains AND food
  //    weight > 0, append a hunt directive.
  let huntDirective: RestBundle['hunt'] = null;
  if (weights.food > 0 && remaining >= HUNT_HOURS && shouldHunt(state, rng)) {
    const target = pickHuntTarget(state);
    huntDirective = { target: target.target, ammo: target.ammo, hunters: pickHunters(state) };
  }

  return { campActions, hunt: huntDirective };
}

/** Dispatcher: invokes persona.bundleCampActions override when present,
 *  otherwise calls defaultBundleCampActions with persona.bundleWeights
 *  and a bound shouldHunt. Single call point for runner.ts (player-bot)
 *  and npc-engine.ts (NPC tick). */
export function bundleCampActions(
  persona: Persona,
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  if (persona.bundleCampActions) return persona.bundleCampActions(state, primary, rng);
  return defaultBundleCampActions(
    state, primary, persona.bundleWeights,
    (s, r) => persona.shouldHunt(s, r),
    rng,
  );
}

/** #927 — chaos override. Random shuffle pick to fill the budget — but
 *  CAPPED at 2 actions max so the persona doesn't drain rations on every
 *  rest day. Deterministic via seeded rng — same seed → same bundle.
 *
 *  Pre-tuning (#1153) chaos picked 4-6 actions per rest day, dragging
 *  4/0 arrival to 0%. Capping at 2 makes chaos feel random without
 *  cascading resource exhaustion. */
const CHAOS_MAX_ACTIONS = 2;
export function chaosBundle(
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  const avail = BUNDLEABLE_ACTIONS.filter(
    (id) => CAMP_ACTIONS_BY_ID[id].availability(state).available,
  );
  const shuffled = shuffleRng(avail, rng);
  const seed = primary ?? shuffled[0] ?? null;
  const campActions: CampActionId[] = [];
  let remaining = TIME_BUDGET_HOURS;
  if (seed && CAMP_ACTIONS_BY_ID[seed]?.availability(state).available) {
    campActions.push(seed);
    remaining -= hourCostFor(CAMP_ACTIONS_BY_ID[seed], state);
  }
  for (const id of shuffled) {
    if (campActions.length >= CHAOS_MAX_ACTIONS) break;
    if (id === seed) continue;
    const h = hourCostFor(CAMP_ACTIONS_BY_ID[id], state);
    if (h <= remaining) {
      campActions.push(id);
      remaining -= h;
    }
  }
  // Hunt directive computed but not applied at slice-2 layer (#927); kept
  // for slice-3 NPC parity and future re-enable. Tightened from 40% → 15%
  // to align with capped action count once hunt application returns.
  let huntDirective: RestBundle['hunt'] = null;
  if (remaining >= HUNT_HOURS && rng.next() < 0.15) {
    const tgt = pickHuntTarget(state);
    huntDirective = { target: tgt.target, ammo: tgt.ammo, hunters: pickHunters(state) };
  }
  return { campActions, hunt: huntDirective };
}

/** #927 — faithful override. On Sunday: domestic activities only
 *  (maintenance weight=0). On weekdays: full bundle. Sabbath was
 *  historically rest from TRAVEL and from heavy mechanical labor,
 *  not from cooking, child-care, prayer, or sustenance hunting
 *  (Methodist Quarterly 1846). */
export function faithfulBundle(
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  // Tuned (#1153): pre-tuning weights pulled 4-6 actions per rest day,
  // dropping faithful 4/0 arrival from 50% to 23%. Trimmed to favour
  // survival (water/firewood) on weekdays with light morale/maintenance
  // accents, and survival+morale-only on Sundays. Sabbath still skips
  // maintenance entirely; weekdays allow it as a low-weight tier 1.
  const weights: BundleWeights = isSunday(state.date)
    ? { survival: 2, food: 0, maintenance: 0, hygiene: 0, morale: 1 }
    : { survival: 2, food: 0, maintenance: 1, hygiene: 0, morale: 1 };
  // Faithful hunts: emigrant practice allowed "necessary labor for
  // sustenance" on the Sabbath. Sunday threshold tighter — only when
  // food critically low; weekday at normal threshold.
  const food = totalFoodLb(state);
  const shouldHunt: ShouldHuntFn = (s) => isSunday(s.date) ? food < 30 : food < 60;
  return defaultBundleCampActions(state, primary, weights, shouldHunt, rng);
}
