import type { GameState } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';

export function progressConditions(state: GameState, _rng: Rng): GameState {
  let moraleDelta = 0;

  const party = state.party.map((m) => {
    if (m.dead) return m;
    let healthDelta = 0;
    const conditions = m.conditions.map((c) => {
      const meta = getCondition(c.id);
      healthDelta += meta.dailyHealthDelta;
      if (meta.dailyMoraleDelta) moraleDelta += meta.dailyMoraleDelta;
      return { ...c, daysSinceOnset: c.daysSinceOnset + 1 };
    });
    const health = Math.max(0, Math.min(100, m.health + healthDelta));
    return { ...m, health, conditions };
  });

  const morale = Math.max(0, Math.min(100, state.morale + moraleDelta));
  return { ...state, party, morale };
}
