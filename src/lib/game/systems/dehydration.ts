import type { GameState } from '../types';

// Dehydration — the party dying of thirst on a short clock.
//
// Trigger: end-of-tick water (clean + dirty) == 0. The dehydration counter
// (stored on `flags._dehydrationDays`) climbs by one each dry day. Any
// drop of water on a subsequent tick resets it to zero.
//
// #1136 — dirty water counts as not-dry. applyDailyConsumption draws
// clean first, then dirty as fallback (consumption.ts:191) — the party
// IS drinking dirty water, just at disease risk. Dehydration is the
// no-water-at-all emergency; dirty-water disease is a separate channel
// via applyDirtyWaterRisk. Pre-fix the counter ticked on any day clean
// hit 0, so a pre-1854 party using find_water (which fills dirtyWater)
// without a doctor would die of "dehydration" with a wagon full of
// water.
//
// Damage curve (per adult, scaled by terrain):
//   dry-day 1: morale −10, health  0
//   dry-day 2: morale −10, health −10
//   dry-day 3: morale −15, health −20
//   dry-day 4: morale −20, health −30
//   dry-day 5: morale −25, health −40   (almost guaranteed kill)
//
// Children: identical morale hit, health hit scaled 0.7× (smaller bodies
// dehydrate faster but also get water priority during consumption so the
// net effect is close to adult).
//
// Terrain: desert = 1.5×, mountains = 1.0×, prairie = 1.0×, forest = 0.85×.
// River terrain is transient (crossing a ford) and doesn't modify.

const HEALTH_PER_DRY_DAY = [0, 0, 10, 20, 30, 40] as const;
const MORALE_PER_DRY_DAY = [0, 10, 10, 15, 20, 25] as const;

const TERRAIN_MULT: Record<string, number> = {
  desert: 1.5,
  mountains: 1.0,
  prairie: 1.0,
  forest: 0.85,
  river: 1.0
};

function healthHit(days: number): number {
  const idx = Math.min(days, HEALTH_PER_DRY_DAY.length - 1);
  return HEALTH_PER_DRY_DAY[idx];
}
function moraleHit(days: number): number {
  const idx = Math.min(days, MORALE_PER_DRY_DAY.length - 1);
  return MORALE_PER_DRY_DAY[idx];
}

export function applyDehydration(state: GameState): GameState {
  // #1136 — dirty water counts as not-dry; party drinks it via
  // applyDailyConsumption's dirty-fallback path.
  const totalWater = state.resources.water + (state.resources.dirtyWater ?? 0);
  const dry = totalWater <= 0;
  const prior = typeof state.flags._dehydrationDays === 'number'
    ? (state.flags._dehydrationDays as number)
    : 0;

  // Wet day after a dry streak — clear the counter, no damage.
  if (!dry) {
    if (prior === 0) return state;
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._dehydrationDays;
    return {
      ...state,
      flags,
      eventLog: [
        ...state.eventLog,
        { day: state.day, text: 'The party drank their fill. Color returns.' }
      ]
    };
  }

  // Still dry. Accumulate a day and apply penalties.
  const days = prior + 1;
  const terrainMult = TERRAIN_MULT[state.location.terrain] ?? 1.0;
  const hpLoss = Math.round(healthHit(days) * terrainMult);
  const moraleLoss = Math.round(moraleHit(days) * terrainMult);

  const party = state.party.map((m) => {
    if (m.dead) return m;
    // Children take a slightly softer hit — adults surrender water to
    // them first in consumption, so direct health damage scales down.
    const mult = m.kind === 'child' ? 0.7 : 1.0;
    const loss = Math.round(hpLoss * mult);
    return { ...m, health: Math.max(0, m.health - loss) };
  });

  const line =
    days === 1
      ? 'The wagon ran dry. A rough day without water.'
      : days === 2
        ? 'Second day with no water. Lips cracked, eyes sunk.'
        : days <= 4
          ? `Day ${days} without water. The party is failing — health −${hpLoss}.`
          : `Day ${days} without water. The dying have begun.`;

  return {
    ...state,
    morale: Math.max(0, state.morale - moraleLoss),
    party,
    flags: { ...state.flags, _dehydrationDays: days },
    eventLog: [...state.eventLog, { day: state.day, text: line }]
  };
}
