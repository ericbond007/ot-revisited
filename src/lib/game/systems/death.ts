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
  // Flag a pending burial — the next event roll will fire the burial event.
  // (If all-dead, no point: game is wiped.)
  const flags = allDead
    ? state.flags
    : { ...state.flags, _burialPending: true };

  // The death of a child weighs heavier on morale than an adult's. We don't
  // change the burial event's penalties (that's a separate moment); this is
  // an immediate hit applied at the moment of death so the party visibly
  // reels even before the burial choice. Adult deaths apply no immediate
  // morale change here — burial event already covers that.
  let immediateMorale = 0;
  for (let i = 0; i < party.length; i++) {
    if (state.party[i].dead) continue;
    if (!party[i].dead) continue;
    if (party[i].kind === 'child') immediateMorale -= 8;
  }
  const morale = immediateMorale === 0
    ? state.morale
    : Math.max(0, state.morale + immediateMorale);

  return {
    ...state,
    party,
    flags,
    morale,
    completed: allDead ? true : state.completed,
    outcome: allDead ? 'wiped' : state.outcome,
    eventLog: [
      ...state.eventLog,
      ...party
        .filter((m, i) => !state.party[i].dead && m.dead)
        .map((m) => ({
          day: state.day,
          text: m.kind === 'child'
            ? `${m.name}, a child, has died. Cause: ${m.deathCause}. The party is shattered (morale −8).`
            : `${m.name} has died. Cause: ${m.deathCause}.`
        }))
    ]
  };
}
