import type { GameState, Condition } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';
import { MOURNING_MORALE_CAP } from './morale';

// #1403 — flat-happy probe showed median run-minimum morale 77–83 with the rich
// recovery economy (Sunday +10, camp actions, comfort items, train +1/day,
// holidays). Period grief diaries (Amelia Stewart Knight 1853, Helen Carpenter
// 1857) record weeks of entries anchored to each burial. These immediate hits +
// the mourning window recreate that weight without re-creating the one-way
// ratchet documented in #918 (recovery isn't suppressed, just bounded for 14d).
export const ADULT_DEATH_MORALE = -10;
export const CHILD_DEATH_MORALE = -16;

/** Days the party is in mourning after a death. During this window morale is
 *  capped at MOURNING_MORALE_CAP; gains below the cap still apply. */
export const MOURNING_DAYS = 14;

// MOURNING_MORALE_CAP lives in morale.ts (alongside applyMourningCap) to avoid
// a circular dep; re-exported from there.

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

  // #1403 — deeper immediate morale hits at moment of death (pre-burial).
  // Adult: −10; child: −16. These replace the old "adult=0 / child=−8"
  // values (flat-happy probe + period grief-diary anchor — see header constants).
  // The burial event's own penalties are untouched.
  let immediateMorale = 0;
  for (let i = 0; i < party.length; i++) {
    if (state.party[i].dead) continue;
    if (!party[i].dead) continue;
    immediateMorale += party[i].kind === 'child' ? CHILD_DEATH_MORALE : ADULT_DEATH_MORALE;
  }
  // #1403 — mourning window: cap morale at MOURNING_MORALE_CAP for MOURNING_DAYS
  // after any death. Successive deaths extend the window (take the max).
  // Applied immediately here so the death day itself respects the cap.
  // All-dead wipes: _mourningUntilDay is irrelevant but we still stamp it
  // (no harm; the game is over).
  const priorMourning = typeof flags._mourningUntilDay === 'number'
    ? (flags._mourningUntilDay as number)
    : 0;
  const newMourning = state.day + MOURNING_DAYS;
  const mourningUntilDay = Math.max(priorMourning, newMourning);
  const flagsWithMourning = { ...flags, _mourningUntilDay: mourningUntilDay };

  const moraleAfterHit = immediateMorale === 0
    ? state.morale
    : Math.max(0, state.morale + immediateMorale);
  // Clamp immediately to the mourning cap.
  const morale = Math.min(moraleAfterHit, MOURNING_MORALE_CAP);

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
    flags: flagsWithMourning,
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
            ? `${m.name}, a child, has died. Cause: ${m.deathCause}. The party is shattered (morale −${Math.abs(CHILD_DEATH_MORALE)}).`
            : `${m.name} has died. Cause: ${m.deathCause}. The party grieves (morale −${Math.abs(ADULT_DEATH_MORALE)}).`
        })),
      ...starvationCallout
    ]
  };
}
