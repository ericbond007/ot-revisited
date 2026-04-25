import type { GameState } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';
import { hasLiveDoctor } from '../professions/predicates';

// Doctor profession dampens condition damage by 30% — they bleed,
// purge, dose with calomel and laudanum, and the patient takes a
// gentler beating from disease and injury. Applied to the daily
// health delta only; morale delta still hits in full.
const DOCTOR_RELIEF_MULT = 0.7;

export function progressConditions(state: GameState, _rng: Rng): GameState {
  let moraleDelta = 0;
  const reliefMult = hasLiveDoctor(state) ? DOCTOR_RELIEF_MULT : 1.0;

  const party = state.party.map((m) => {
    if (m.dead) return m;
    let healthDelta = 0;
    const conditions = m.conditions.map((c) => {
      const meta = getCondition(c.id);
      healthDelta += meta.dailyHealthDelta * reliefMult;
      if (meta.dailyMoraleDelta) moraleDelta += meta.dailyMoraleDelta;
      return { ...c, daysSinceOnset: c.daysSinceOnset + 1 };
    });
    const health = Math.max(0, Math.min(100, m.health + Math.round(healthDelta)));
    return { ...m, health, conditions };
  });

  const morale = Math.max(0, Math.min(100, state.morale + moraleDelta));
  return { ...state, party, morale };
}
