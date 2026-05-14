import type { GameState, Ox, Pace, Terrain } from '../types';
import type { Rng } from '../rng';
import { hasLiveTeamster } from '../professions/predicates';
import { loadFatigueMult } from './load';
import { getWagon } from '../content/wagons';

const FATIGUE_PER_DAY_BY_PACE: Record<Pace, number> = {
  slow: 2,
  moderate: 4,
  fast: 6,
  grueling: 9
};

const SHOELESS_FATIGUE_MULTIPLIER = 1.5;
const HIGH_FATIGUE_THRESHOLD = 80;
const OVERWORK_HEALTH_DRAIN = 2;
export const TEAMSTER_FATIGUE_MULT = 0.85;
export const TEAMSTER_RECOVERY_MULT = 1.20;
// Teamster knows the team's habits — bedded down right, picketed
// the wanderers, kept the bell-ox on. Cuts the per-day stray-incident
// chance by 40% (#220, #221).
export const TEAMSTER_STRAY_MULT = 0.6;

// Mules can't subsist on prairie grass alone. 1 lb grain per live
// mule per day. Without grain, fatigue climbs 2× on unfed mules.
export const GRAIN_LB_PER_MULE = 1;
const MULE_UNFED_FATIGUE_MULT = 2.0;

// --- Grazing (#105) ---
//
// Real-history: oxen grazed at night halts and noon stops. On the
// summer prairie this was free fuel; in the mountains, deserts, or
// after fall frost, grass was sparse or dormant and the oxen
// thinned. Emigrants who didn't carry supplemental feed (corn, hay,
// the same `grain` mules eat) watched their teams weaken. We model
// this with a per-terrain × per-season quality 0..1, an optional
// per-ox feed offset, and combined fatigue + recovery effects.

const TERRAIN_GRAZING: Record<Terrain, number> = {
  prairie: 1.0,
  forest: 0.7,
  river: 0.6,
  mountains: 0.4,
  desert: 0.2
};

// Months 11-3 (Nov-Mar) — dormant/frozen grass on most of the trail.
// Halves grazing quality across the board.
const DORMANT_SEASON_MULT = 0.5;

// Threshold below which oxen will draw grain to supplement. At/above,
// grass is enough on its own. 0.6 ≈ "decent prairie/forest".
const OXEN_FEED_THRESHOLD = 0.6;

// 1 lb grain per live ox per day on poor-grazing terrain. Same burn
// rate as mules — keeps the math approachable.
export const GRAIN_LB_PER_OX = 1;

// How hard poor grazing pushes back. At grazing=0 with no feed, oxen
// fatigue +40% per travel day and recovery cuts by ~half. Players
// who carry grain neutralize the penalty entirely.
const GRAZING_FATIGUE_PENALTY = 0.4;

/** Pure grass-quality 0..1 — no side effects, no feed math. */
export function grazingQuality(state: GameState): number {
  const base = TERRAIN_GRAZING[state.location.terrain];
  const m = state.date.month;
  const dormant = m >= 11 || m <= 3;
  return dormant ? base * DORMANT_SEASON_MULT : base;
}

/** Apply ox grain feeding for one day. Returns the updated state, the
 *  count of oxen that got fed, and the effective grazing fraction
 *  (0..1) for the team after the feed offset. Called by tickOxen on
 *  travel days and by rest.ts on rest days — mutually exclusive, so
 *  oxen don't double-eat on a given calendar day.
 *
 *  When grass is good (>= threshold), no feed is consumed and the
 *  effective grazing is the raw quality. When grass is poor, oxen
 *  draw 1 lb each from the grain pool; whoever doesn't get fed
 *  contributes their raw (poor) quality to the team average. */
export function consumeOxenFeed(state: GameState): {
  state: GameState;
  fedOxen: number;
  effectiveGrazing: number;
} {
  const grazing = grazingQuality(state);
  const liveOxen = state.oxen.filter((a) => a.health > 0 && a.kind !== 'mule');
  if (liveOxen.length === 0 || grazing >= OXEN_FEED_THRESHOLD) {
    return { state, fedOxen: 0, effectiveGrazing: grazing };
  }
  const need = liveOxen.length * GRAIN_LB_PER_OX;
  const have = state.inventory.grain ?? 0;
  const eaten = Math.min(need, have);
  const fedOxen = Math.floor(eaten / GRAIN_LB_PER_OX);
  const fedFraction = fedOxen / liveOxen.length;
  const effective = grazing + (1 - grazing) * fedFraction;
  const next: GameState = eaten > 0
    ? { ...state, inventory: { ...state.inventory, grain: have - eaten } }
    : state;
  return { state: next, fedOxen, effectiveGrazing: effective };
}

/** Travel-fatigue multiplier from current effective grazing. */
function grazingFatigueMult(effectiveGrazing: number): number {
  return 1 + GRAZING_FATIGUE_PENALTY * (1 - effectiveGrazing);
}

// Max team-factor bonus from spare oxen above the wagon's optimal team.
// Spares provide insurance (one dies, next keeps pulling) with a small
// speed bonus — not a farmable advantage.
const TEAM_FACTOR_CAP = 1.1;

export function tickOxen(state: GameState, _rng: Rng): GameState {
  const base = FATIGUE_PER_DAY_BY_PACE[state.pace];
  const teamsterMult = hasLiveTeamster(state) ? TEAMSTER_FATIGUE_MULT : 1;
  const overloadMult = loadFatigueMult(state);

  // Feed the mules before they tick fatigue — 1 lb grain per live
  // mule. If the grain runs out mid-day, the unfed mules tick with
  // a 2× fatigue multiplier that day.
  const liveMules = state.oxen.filter((a) => a.health > 0 && a.kind === 'mule');
  const muleNeed = liveMules.length * GRAIN_LB_PER_MULE;
  const haveGrain = state.inventory.grain ?? 0;
  const muleAte = Math.min(muleNeed, haveGrain);
  const muleUnfed = muleNeed - muleAte;
  let s: GameState = muleAte > 0
    ? { ...state, inventory: { ...state.inventory, grain: haveGrain - muleAte } }
    : state;

  // Then feed the oxen out of whatever grain is left, but only if
  // grazing is poor enough to warrant it. Returns the team's
  // effective grazing fraction post-feed.
  const oxFeed = consumeOxenFeed(s);
  s = oxFeed.state;
  const fatigueMult = grazingFatigueMult(oxFeed.effectiveGrazing);

  // #963 follow-up: only oxen IN HARNESS accumulate fatigue. Spares
  // walking alongside the wagon graze + rest as they go — period-
  // correct (Marcy 1859 describes rotating the team for exactly this
  // reason). Before this change, all live oxen tired in lockstep, so
  // the spare yoke gave only insurance against death, not the
  // rotation-rest benefit it gave historical emigrants.
  // The hitch set is recomputed each tick by selectHitchedOxen — top
  // N fittest oxen rotate into harness automatically as today's
  // pullers tire.
  //
  // Fallback: when neither yokes nor mules are modeled in inventory
  // (NPC wagons + many unit tests), hitchedCap is 0 — fall back to
  // 'all alive count as hitched' so legacy fatigue behavior is
  // preserved for state that doesn't track yoke inventory.
  const hitchedCap = hitchedOxenCount(s) + liveMules.length;
  const aliveOxen = s.oxen.filter((o) => o.health > 0);
  const hitchedIds = new Set(
    hitchedCap > 0
      ? selectHitchedOxen(s.oxen, hitchedCap).map((o) => o.id)
      : aliveOxen.map((o) => o.id)
  );

  const oxen = s.oxen.map((animal) => {
    if (animal.health === 0) return animal;
    if (!hitchedIds.has(animal.id)) return animal;
    const mulePenalty =
      animal.kind === 'mule' && muleUnfed > 0 ? MULE_UNFED_FATIGUE_MULT : 1;
    // Mules use their own grain rule; the team grazing penalty
    // applies to oxen only.
    const grazingPenalty = animal.kind === 'mule' ? 1 : fatigueMult;
    const fatigueGain = Math.round(
      base
        * (animal.shod ? 1 : SHOELESS_FATIGUE_MULTIPLIER)
        * teamsterMult
        * overloadMult
        * mulePenalty
        * grazingPenalty
    );
    const fatigue = Math.min(100, animal.fatigue + fatigueGain);
    const healthDrain = fatigue >= HIGH_FATIGUE_THRESHOLD ? OVERWORK_HEALTH_DRAIN : 0;
    const health = Math.max(0, animal.health - healthDrain);
    return { ...animal, fatigue, health };
  });

  let nextState: GameState = { ...s, oxen };

  if (muleUnfed > 0 && liveMules.length > 0) {
    nextState = {
      ...nextState,
      eventLog: [
        ...nextState.eventLog,
        {
          day: state.day,
          text: `${muleUnfed} ${muleUnfed === 1 ? 'mule went' : 'mules went'} without feed today. Fatigue climbing fast.`
        }
      ]
    };
  }

  // Note when oxen had to subsist on poor grass without feed — the
  // player should learn to carry grain through mountain/desert legs.
  // Only logs when at least one ox went unfed AND grass was poor.
  const liveOxen = nextState.oxen.filter((a) => a.health > 0 && a.kind !== 'mule');
  const oxenUnfed = liveOxen.length - oxFeed.fedOxen;
  if (
    oxFeed.effectiveGrazing < OXEN_FEED_THRESHOLD
    && oxenUnfed > 0
    && liveOxen.length > 0
  ) {
    nextState = {
      ...nextState,
      eventLog: [
        ...nextState.eventLog,
        {
          day: state.day,
          text: `Thin grazing — ${oxenUnfed} ${oxenUnfed === 1 ? 'ox' : 'oxen'} on short rations.`
        }
      ]
    };
  }

  return nextState;
}

/**
 * Team-factor + fitness speed multiplier. `optimalTeam` comes from the wagon
 * model (Light=2, Prairie=4, Heavy=6). Below `optimalTeam`, the team
 * underperforms proportionally; above it, spares give at most TEAM_FACTOR_CAP
 * bonus.
 *
 * `hitchedCount` (#107) caps how many of the alive animals can actually
 * be hitched to the wagon — limited by yokes on hand. Unhitched oxen
 * still tire and graze but don't pull. Defaults to all alive when the
 * caller doesn't model yokes (legacy callers / tests).
 */
/** Per-ox fitness 0..1 — health × fatigue-adjusted pull rate. Used to
 *  rank oxen for harness selection (sort key) and to compute team speed
 *  factor (average).
 *
 *  #963 F2 — fatigue denominator 100 → 200 (linear-to-50%, not
 *  linear-to-zero). Period anchors:
 *    Bryant 1846 day ~70 (fatigue ~50): "ten or twelve miles per day"
 *      vs fresh ~18 → 67-75% speed.
 *    Reed Donner Sierra (fatigue ~100, terminal): "oxen pulling at
 *      half their usual rate" → 50% speed.
 *    Bidwell 1841 day ~90 (fatigue ~90): "could scarcely lift heads"
 *      but still pulling → ~55% speed.
 *  Old curve (fatigue/100) overshot Bryant by 2× at mid-fatigue and
 *  collapsed to literal zero at fatigue 100, which never happened in
 *  the diaries — Bidwell's near-collapse oxen were still in harness.
 *  New /200 curve maps cleanly onto each anchor:
 *    fatigue 50  → 0.75 (Bryant)
 *    fatigue 80  → 0.60 (mid)
 *    fatigue 100 → 0.50 (Reed Donner terminal) */
export function oxFitness(ox: Ox): number {
  return (ox.health / 100) * (1 - ox.fatigue / 200);
}

/** Pick the team that goes in harness today — top-N fittest alive oxen.
 *  Shared by oxenSpeedFactor (which scores them) and tickOxen (which
 *  only tires the hitched team, post-#963 follow-up). Sort tie-broken
 *  by id for determinism. */
export function selectHitchedOxen(oxen: Ox[], hitchedCount?: number): Ox[] {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return [];
  const ordered = [...alive].sort((a, b) => {
    const aFit = oxFitness(a);
    const bFit = oxFitness(b);
    if (bFit !== aFit) return bFit - aFit;
    return a.id.localeCompare(b.id);
  });
  const cap = Math.max(0, Math.min(hitchedCount ?? alive.length, alive.length));
  return ordered.slice(0, cap);
}

export function oxenSpeedFactor(
  oxen: Ox[],
  optimalTeam: number = 2,
  hitchedCount?: number
): number {
  const hitched = selectHitchedOxen(oxen, hitchedCount);
  if (hitched.length === 0) return 0;
  const avgFitness = hitched.reduce((s, o) => s + oxFitness(o), 0) / hitched.length;
  const teamFactor = Math.min(TEAM_FACTOR_CAP, hitched.length / Math.max(1, optimalTeam));
  return teamFactor * avgFitness;
}

/** Number of alive oxen that can actually be hitched given yokes on hand
 *  (1 yoke per pair). Excludes mules — they're harnessed differently
 *  and aren't gated by the ox-yoke supply. */
export function hitchedOxenCount(state: GameState): number {
  const liveOxen = state.oxen.filter((o) => o.health > 0 && o.kind !== 'mule').length;
  const yokes = state.inventory.yoke ?? 0;
  return Math.min(liveOxen, yokes * 2);
}

/** Convenience: compute ox speed factor from full state (reads wagon model
 *  and yoke supply). */
export function oxenSpeedFactorFor(state: GameState): number {
  const wagon = getWagon(state.wagon.model);
  // Hitched cap counts yoked oxen + all mules (mules don't share the
  // yoke pool). Add live mules back so a mixed team still pulls.
  const liveMules = state.oxen.filter((o) => o.health > 0 && o.kind === 'mule').length;
  return oxenSpeedFactor(state.oxen, wagon.optimalTeam, hitchedOxenCount(state) + liveMules);
}

// Recovery applied when the party rests or camps.
// Dead oxen unaffected. Returns a new array.
export function recoverOxenFatigue(oxen: Ox[], amount: number): Ox[] {
  return oxen.map((o) => {
    if (o.health === 0) return o;
    const fatigue = Math.max(0, o.fatigue - amount);
    return { ...o, fatigue };
  });
}
