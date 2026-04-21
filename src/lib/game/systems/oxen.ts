import type { GameState, Ox, Pace } from '../types';
import type { Rng } from '../rng';

const FATIGUE_PER_DAY_BY_PACE: Record<Pace, number> = {
  slow: 2,
  moderate: 4,
  fast: 6,
  grueling: 9
};

const SHOELESS_FATIGUE_MULTIPLIER = 1.5;
const HIGH_FATIGUE_THRESHOLD = 80;
const OVERWORK_HEALTH_DRAIN = 2;

export function tickOxen(state: GameState, _rng: Rng): GameState {
  const base = FATIGUE_PER_DAY_BY_PACE[state.pace];
  const oxen = state.oxen.map((ox) => {
    if (ox.health === 0) return ox;
    const fatigueGain = Math.round(base * (ox.shod ? 1 : SHOELESS_FATIGUE_MULTIPLIER));
    const fatigue = Math.min(100, ox.fatigue + fatigueGain);
    const healthDrain = fatigue >= HIGH_FATIGUE_THRESHOLD ? OVERWORK_HEALTH_DRAIN : 0;
    const health = Math.max(0, ox.health - healthDrain);
    return { ...ox, fatigue, health };
  });
  return { ...state, oxen };
}

export function oxenSpeedFactor(oxen: Ox[]): number {
  const alive = oxen.filter((o) => o.health > 0);
  if (alive.length === 0) return 0;
  const avgFitness =
    alive.reduce((s, o) => s + (o.health / 100) * (1 - o.fatigue / 100), 0) / alive.length;
  const teamFactor = Math.min(1.2, alive.length / 2);
  return teamFactor * avgFitness;
}
