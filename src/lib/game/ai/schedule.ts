import type { GameState } from '../types';
import type { PersonaId } from './types';

/** Full Oregon Trail length in miles. Single source of truth; personas.ts
 *  imports this. */
export const TOTAL_TRAIL_MI = 2195;

const MIN_JUDGE_DAYS = 20;
const MIN_JUDGE_MILES = 100;
const CRITICAL_MARGIN = 15;

export type SchedulePressure = 'ok' | 'behind' | 'critical';

export interface ScheduleDoctrine {
  targetArrivalDay: number | null;
  sabbathSacred: boolean;
}

export function projectedArrivalDay(state: GameState): number | null {
  const day = state.day ?? 0;
  const miles = state.location?.milesTraveled ?? 0;
  if (day < MIN_JUDGE_DAYS || miles < MIN_JUDGE_MILES) return null;
  return day * (TOTAL_TRAIL_MI / miles);
}

export function schedulePressure(
  state: GameState,
  targetArrivalDay: number | null
): SchedulePressure {
  if (targetArrivalDay === null) return 'ok';
  const proj = projectedArrivalDay(state);
  if (proj === null) return 'ok';
  if (proj <= targetArrivalDay) return 'ok';
  if (proj <= targetArrivalDay + CRITICAL_MARGIN) return 'behind';
  return 'critical';
}

export const personaScheduleDoctrine: Record<PersonaId, ScheduleDoctrine> = {
  pace_pusher:   { targetArrivalDay: 165, sabbathSacred: false },
  aggressive:    { targetArrivalDay: 175, sabbathSacred: false },
  balanced:      { targetArrivalDay: 185, sabbathSacred: false },
  generous:      { targetArrivalDay: 190, sabbathSacred: false },
  cautious:      { targetArrivalDay: 190, sabbathSacred: false },
  sunday_rester: { targetArrivalDay: 195, sabbathSacred: true },
  faithful:      { targetArrivalDay: 195, sabbathSacred: true },
  hoarder:       { targetArrivalDay: 205, sabbathSacred: false },
  drinker:       { targetArrivalDay: 205, sabbathSacred: false },
  chaos:         { targetArrivalDay: null, sabbathSacred: false }
};

export function doctrineFor(id: PersonaId): ScheduleDoctrine {
  return personaScheduleDoctrine[id] ?? personaScheduleDoctrine.balanced;
}

/** Keg ratio at/under which find-water is a survival need, never suppressed. */
const CRITICAL_WATER_RATIO = 0.35;
/** Food (lbs) at/under which hunting is a survival need, never suppressed. */
const STARVATION_FLOOR = 45;
/** Below this (but above the death-spiral crisis floor), a party is too
 *  fragile to push: schedule pressure must NOT cut its recovery rest/forage.
 *  Keyed on HP only — morale is comfort, not survival, so a demoralised but
 *  HEALTHY party that's behind should push on grumpy, not rest into the clock
 *  (#1235b — morale clause dropped; it was disabling the gate for the whole
 *  morale-sagging late-trail majority). Worn oxen are handled by crisis rest. */
const MIN_PUSH_HP = 60;

function minAliveHealth(state: GameState): number {
  const alive = (state.party ?? []).filter((m) => !m.dead);
  if (alive.length === 0) return 100;
  return Math.min(...alive.map((m) => m.health));
}

/** True when the party is too worn (low HP or morale) to be pushed past its
 *  recovery rest — schedule pressure stands down so it can recoup. */
export function tooFragileToPush(state: GameState): boolean {
  // Family wagons aren't schedule-pushed (#1235). Rationale is LOGISTICS,
  // not child fragility: more mouths thin provisions across the same wagon,
  // and families historically traveled at a measured pace (Faragher 1979).
  // (Children are actually modeled hardier than adults — 0.7x dehydration,
  // lighter consumption — so this is not about protecting fragile kids;
  // historical child mortality is under-modeled and tracked separately.)
  const hasChild = (state.party ?? []).some((m) => !m.dead && m.kind === 'child');
  if (hasChild) return true;
  return minAliveHealth(state) < MIN_PUSH_HP;
}

export type DiscretionaryCamp = 'hunt' | 'pan' | 'findWater';

/** True = schedule pressure should veto this discretionary camp action now.
 *  Critical floors (near-empty keg, near-starvation) always return false. */
export function suppressCamp(
  state: GameState,
  personaId: PersonaId,
  kind: DiscretionaryCamp,
  opts: { waterRatio?: number; foodOnHand?: number } = {}
): boolean {
  const doctrine = doctrineFor(personaId);
  const pressure = schedulePressure(state, doctrine.targetArrivalDay);
  if (pressure === 'ok') return false;
  if (tooFragileToPush(state)) return false;
  switch (kind) {
    case 'hunt':
      return (opts.foodOnHand ?? Infinity) > STARVATION_FLOOR;
    case 'findWater':
      return (opts.waterRatio ?? 1) >= CRITICAL_WATER_RATIO;
    case 'pan':
      return true;
  }
}

/** Sunday-rest gate. Sacred personas always rest; others skip it when behind. */
export function allowsSabbathRest(state: GameState, personaId: PersonaId): boolean {
  const doctrine = doctrineFor(personaId);
  if (doctrine.sabbathSacred) return true;
  if (tooFragileToPush(state)) return true;
  return schedulePressure(state, doctrine.targetArrivalDay) === 'ok';
}
