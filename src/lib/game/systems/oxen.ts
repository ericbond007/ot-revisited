import type { GameState, Ox, Pace } from '../types';
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
  const need = liveMules.length * GRAIN_LB_PER_MULE;
  const haveGrain = state.inventory.grain ?? 0;
  const ateGrain = Math.min(need, haveGrain);
  const unfed = need - ateGrain;
  const inventory = ateGrain > 0
    ? { ...state.inventory, grain: haveGrain - ateGrain }
    : state.inventory;

  const oxen = state.oxen.map((ox) => {
    if (ox.health === 0) return ox;
    const mulePenalty =
      ox.kind === 'mule' && unfed > 0 ? MULE_UNFED_FATIGUE_MULT : 1;
    const fatigueGain = Math.round(
      base * (ox.shod ? 1 : SHOELESS_FATIGUE_MULTIPLIER) * teamsterMult * overloadMult * mulePenalty
    );
    const fatigue = Math.min(100, ox.fatigue + fatigueGain);
    const healthDrain = fatigue >= HIGH_FATIGUE_THRESHOLD ? OVERWORK_HEALTH_DRAIN : 0;
    const health = Math.max(0, ox.health - healthDrain);
    return { ...ox, fatigue, health };
  });

  let nextState: GameState = { ...state, oxen, inventory };

  if (unfed > 0 && liveMules.length > 0) {
    nextState = {
      ...nextState,
      eventLog: [
        ...nextState.eventLog,
        {
          day: state.day,
          text: `${unfed} ${unfed === 1 ? 'mule went' : 'mules went'} without feed today. Fatigue climbing fast.`
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
