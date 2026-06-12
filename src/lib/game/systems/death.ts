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
  // #1021 audit: dehydration HP drain doesn't set a condition (per #135
  // design) so deaths during dry-day streaks were silently labeled
  // 'Exposure' (the default fallback). With water tracking, we can
  // reliably attribute: if the keg is dry OR we've been in a dry streak,
  // the death cause is Dehydration.
  const dryStreakActive =
    state.resources.water <= 0
    || (typeof state.flags._dehydrationDays === 'number' && (state.flags._dehydrationDays as number) >= 1);

  const party = state.party.map((m) => {
    if (m.dead) return m;
    if (m.health > 0) return m;
    anyChange = true;
    const fromCondition = causeFromConditions(m.conditions);
    // Cause priority:
    //   1. Pre-attributed cause — events that kill through a specific mechanism
    //      (e.g. child_wagon_fall) pre-set deathCause on the member and drop
    //      health to 0; the reaper owns the death itself (burial, morale, log).
    //   2. Active condition (cholera, dysentery, etc.).
    //   3. Dehydration (dry-streak active, no condition).
    //   4. Exposure (default fallback).
    const cause = m.deathCause
      ?? fromCondition
      ?? (dryStreakActive ? 'Dehydration' : 'Exposure');
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

  // If anyone just died of Starvation AND the food pile is still empty
  // AND the party isn't fully wiped, surface a pointed call-to-action:
  // the survivors must rest and consider what cannot be spoken aloud.
  const newlyStarved = party.filter(
    (m, i) => !state.party[i].dead && m.dead && m.deathCause === 'Starvation'
  );
  const totalFoodLb = ['game_meat','berries','flour','beans','bacon','jerky','hardtack','dried_fruit','pemmican']
    .reduce((sum, id) => sum + (state.inventory[id] ?? 0), 0);
  const starvationCallout =
    newlyStarved.length > 0 && totalFoodLb === 0 && !allDead
      ? [{
          day: state.day,
          text: `With ${newlyStarved[0].name} gone and the food pile bare, the survivors must rest in camp and do the unthinkable — or share the same fate.`
        }]
      : [];

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
        })),
      ...starvationCallout
    ]
  };
}
