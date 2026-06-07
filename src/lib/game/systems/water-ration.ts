import type { GameState } from '../types';

const CONSERVE_MORALE = 1;
const DRYCAMP_MORALE = 3;
const DRYCAMP_HP_AFTER_DAYS = 3;   // sustained parching
const DRYCAMP_HP = 2;
const CHILD_HP_MULT = 0.7;         // mirror dehydration

/** #1245 — cost of water rationing. Morale always; drycamp adds an HP nick
 *  after sustained use. Charged only while rationing AND the keg still has
 *  water — once dry, applyDehydration owns the damage (no double-count). */
export function applyWaterRationStrain(state: GameState): GameState {
  const tier = state.waterRation ?? 'normal';
  const water = (state.resources.water ?? 0) + (state.resources.dirtyWater ?? 0);
  if (tier === 'normal' || water <= 0) {
    if (state.flags?._drycampDays === undefined) return state;
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._drycampDays;
    return { ...state, flags };
  }

  const moraleLoss = tier === 'drycamp' ? DRYCAMP_MORALE : CONSERVE_MORALE;
  let hpLoss = 0;
  let flags = state.flags;
  if (tier === 'drycamp') {
    const prior = typeof state.flags._drycampDays === 'number'
      ? (state.flags._drycampDays as number)
      : 0;
    const days = prior + 1;
    flags = { ...state.flags, _drycampDays: days };
    if (days > DRYCAMP_HP_AFTER_DAYS) hpLoss = DRYCAMP_HP;
  } else {
    if (state.flags._drycampDays !== undefined) {
      const f = { ...state.flags };
      delete (f as Record<string, unknown>)._drycampDays;
      flags = f;
    }
  }

  const party = hpLoss === 0 ? state.party : state.party.map((m) => {
    if (m.dead) return m;
    const loss = Math.round(hpLoss * (m.kind === 'child' ? CHILD_HP_MULT : 1));
    return { ...m, health: Math.max(0, m.health - loss) };
  });

  return { ...state, flags, party, morale: Math.max(0, state.morale - moraleLoss) };
}
