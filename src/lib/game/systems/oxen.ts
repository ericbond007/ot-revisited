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

  const oxen = s.oxen.map((animal) => {
    if (animal.health === 0) return animal;
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
 */
export function oxenSpeedFactor(oxen: Ox[], optimalTeam: number = 2): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 0;
  const avgFitness =
    alive.reduce((s, o) => s + (o.health / 100) * (1 - o.fatigue / 100), 0) / alive.length;
  const teamFactor = Math.min(TEAM_FACTOR_CAP, alive.length / Math.max(1, optimalTeam));
  return teamFactor * avgFitness;
}

/** Convenience: compute ox speed factor from full state (reads wagon model). */
export function oxenSpeedFactorFor(state: GameState): number {
  const wagon = getWagon(state.wagon.model);
  return oxenSpeedFactor(state.oxen, wagon.optimalTeam);
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
