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
// Children: identical morale hit, health hit scaled 1.3× (CHILD_DEHYDRATION_MULT).
// #1259 §1b (Dave 2026-06-11): the original 0.7× ("children get water priority
// during consumption") has been flipped. The research core claim — small bodies
// lose fluid volume fastest, failing in hours-to-days (Bashore/BYU 2014;
// cholera-era accounts) — applies most literally here: once truly dry (no water
// at all), the physics dominate. The 1.3× figure is moderated vs the raw
// 1.5–1.75 disease-band because children still consume less water via
// CHILD_WATER_MULT = 0.5, so true no-water exposure is lower than adult —
// but the per-unit damage is higher.
//
// Terrain: desert = 1.5×, mountains = 1.0×, prairie = 1.0×, forest = 0.85×.
// River terrain is transient (crossing a ford) and doesn't modify.

const HEALTH_PER_DRY_DAY = [0, 0, 10, 20, 30, 40] as const;
const MORALE_PER_DRY_DAY = [0, 10, 10, 15, 20, 25] as const;

/** #1259 §1b — child dehydration health-damage multiplier.
 *  Dave 2026-06-11: flipped from 0.7× to 1.3×. Small bodies lose fluid
 *  volume fastest once truly dry (Bashore/BYU 2014). Moderated from the
 *  raw 1.5–1.75 disease-band because CHILD_WATER_MULT = 0.5 already
 *  reduces children's total exposure vs adults. Morale deltas unchanged.
 *  Amends design-doc §3 "deliberately unchanged" list. */
export const CHILD_DEHYDRATION_MULT = 1.3;

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
    // #1259 §1b — children take a harder hit once truly dry. Small bodies
    // lose fluid volume fastest (Bashore/BYU 2014). CHILD_DEHYDRATION_MULT
    // is 1.3× (not the raw 1.5–1.75 because CHILD_WATER_MULT = 0.5 already
    // reduces their exposure). Dave 2026-06-11, amends design-doc §3.
    const mult = m.kind === 'child' ? CHILD_DEHYDRATION_MULT : 1.0;
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
