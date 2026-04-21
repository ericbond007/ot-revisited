import type { GameState, Condition } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';

function causeFromConditions(conditions: Condition[]): string | null {
  if (conditions.length === 0) return null;
  const sorted = [...conditions].sort(
    (a, b) => getCondition(a.id).dailyHealthDelta - getCondition(b.id).dailyHealthDelta
  );
  const worst = sorted[0];
  return getCondition(worst.id).name;
}

export function reapDead(state: GameState, _rng: Rng): GameState {
  let anyChange = false;
  const party = state.party.map((m) => {
    if (m.dead) return m;
    if (m.health > 0) return m;
    anyChange = true;
    const cause = causeFromConditions(m.conditions) ?? 'Exposure';
    return {
      ...m,
      dead: true,
      deathCause: cause,
      deathDay: state.day
    };
  });

  if (!anyChange) return state;

  const allDead = party.every((m) => m.dead);
  return {
    ...state,
    party,
    completed: allDead ? true : state.completed,
    outcome: allDead ? 'wiped' : state.outcome,
    eventLog: [
      ...state.eventLog,
      ...party
        .filter((m, i) => !state.party[i].dead && m.dead)
        .map((m) => ({ day: state.day, text: `${m.name} has died. Cause: ${m.deathCause}.` }))
    ]
  };
}
