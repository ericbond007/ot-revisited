import type { GameState, Condition } from '../types';

// Starvation — the party dying of hunger on a short clock. Parallel to
// dehydration but slightly slower (the body burns fat first).
//
// Trigger: applyDailyConsumption sets `_lastFoodShortfall` > 0 when it
// couldn't draw enough from the food pile. `_starvationDays` climbs
// each day with a shortfall and resets when the party eats fully.
//
// Damage curve (per adult):
//   hungry-day 1: morale −5,  health  0
//   hungry-day 2: morale −8,  health −3
//   hungry-day 3: morale −10, health −6
//   hungry-day 4: morale −15, health −10
//   hungry-day 5: morale −20, health −14
//   hungry-day 6+: morale −25, health −16
//
// #1389 re-tune — the old deep end (−40/day, 6-day kill) was calibrated
// against the lay-by resurrection quirk (+8/day lifting 0-HP members off
// the floor before the reaper looked). With that quirk closed, the old
// curve turned every stalled run into a mass grave (year-sweep: 1843
// deaths 0.02 -> 1.07/run). This curve costs a 5-day gap ~33 HP — about
// what the old curve netted AFTER the bounce — while prolonged famine
// now genuinely kills (~10-12 days from full health, no resurrection).
// Period: the body survives weeks of famine with water; trail starvation
// was a long decline, not a 6-day cliff ("slightly slower than
// dehydration" understated it).
//
// Children take a slightly softer health hit (0.8×) since adults give
// up share to them — but morale is the same for everyone.
//
// In addition to the per-day curve, alive members get the 'starvation'
// condition (light additional drain + persistent marker so reapDead
// picks "Starvation" as the deathCause). Members lose the condition
// the day after the party eats normally again.

const HEALTH_PER_HUNGRY_DAY = [0, 0, 3, 6, 10, 14, 16] as const;
const MORALE_PER_HUNGRY_DAY = [0, 5, 8, 10, 15, 20, 25] as const;

function healthHit(days: number): number {
  const idx = Math.min(days, HEALTH_PER_HUNGRY_DAY.length - 1);
  return HEALTH_PER_HUNGRY_DAY[idx];
}
function moraleHit(days: number): number {
  const idx = Math.min(days, MORALE_PER_HUNGRY_DAY.length - 1);
  return MORALE_PER_HUNGRY_DAY[idx];
}

function ensureStarvationCondition(conditions: Condition[]): Condition[] {
  if (conditions.some((c) => c.id === 'starvation')) return conditions;
  return [...conditions, { id: 'starvation', daysSinceOnset: 0 }];
}

function dropStarvationCondition(conditions: Condition[]): Condition[] {
  if (!conditions.some((c) => c.id === 'starvation')) return conditions;
  return conditions.filter((c) => c.id !== 'starvation');
}

export function applyStarvation(state: GameState): GameState {
  const shortfall = (state.flags._lastFoodShortfall as number | undefined) ?? 0;
  const hungry = shortfall > 0;
  const prior = typeof state.flags._starvationDays === 'number'
    ? (state.flags._starvationDays as number)
    : 0;

  // Fed day after a hungry streak — clear counter, drop the condition,
  // log a recovery line.
  if (!hungry) {
    if (prior === 0) return state;
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._starvationDays;
    return {
      ...state,
      flags,
      party: state.party.map((m) =>
        m.dead ? m : { ...m, conditions: dropStarvationCondition(m.conditions) }
      ),
      eventLog: [
        ...state.eventLog,
        { day: state.day, text: 'The party ate a full meal — color returns.' }
      ]
    };
  }

  // Still hungry. Accumulate the day and apply penalties.
  const days = prior + 1;
  const hpLoss = healthHit(days);
  const moraleLoss = moraleHit(days);

  const party = state.party.map((m) => {
    if (m.dead) return m;
    const mult = m.kind === 'child' ? 0.8 : 1.0;
    const loss = Math.round(hpLoss * mult);
    return {
      ...m,
      health: Math.max(0, m.health - loss),
      conditions: ensureStarvationCondition(m.conditions)
    };
  });

  const line =
    days === 1
      ? 'The food ran short — empty bellies tonight.'
      : days === 2
        ? 'Second day on short rations. Tempers thin.'
        : days === 3
          ? `Three days hungry. Health -${hpLoss}.`
          : days <= 5
            ? `Day ${days} of starvation. The party is failing — health -${hpLoss}.`
            : `Day ${days} of starvation. The dying have begun.`;

  return {
    ...state,
    morale: Math.max(0, state.morale - moraleLoss),
    party,
    flags: { ...state.flags, _starvationDays: days },
    eventLog: [...state.eventLog, { day: state.day, text: line }]
  };
}
