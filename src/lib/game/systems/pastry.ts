// #304 + #305 — pastry quality: when flour or cornmeal was drawn this
// tick, check for cookware + saleratus and apply morale modifiers.
//
// Period reality (Bryant 1846 verbatim "biscuits sat heavy on the belly
// all day"; Marcy 1859 lists saleratus on the daily-staple inventory):
// emigrants didn't eat raw flour. Daily kitchen routine baked biscuits
// or johnnycakes. The mechanic stays automatic — no per-day decision —
// but rewards the player who outfit-stocked saleratus and refreshes it
// at posts, and punishes the wagon that lost cookware (see #306).
//
// Quality matrix (period-anchored):
//   cookware ✓ + saleratus ✓ → 0 morale (period normal)
//   cookware ✓ + saleratus ✗ → -1 morale ("biscuits sat heavy")
//   cookware ✗ (any saleratus) → -2 morale ("ate paste again")
//
// Saleratus consumption: ~0.005 lb per lb of flour/cornmeal drawn —
// roughly 1 unit (0.5 lb pack) per 35 days for a 3-eater family at
// 1 lb flour/eater/day. Matches Marcy 1859 outfit prescription of
// 5 lb saleratus for a year-long trip.

import type { GameState } from '../types';
import type { Rng } from '../rng';

/** Per-pound of flour/cornmeal: how much saleratus a properly leavened
 *  biscuit consumes. Tuned so 1 unit (0.5 lb) lasts a 3-person family
 *  ~35 days at 1 lb flour/eater/day. */
export const SALERATUS_LB_PER_PASTRY_LB = 0.005;

/** Morale debit when cookware is missing entirely — even if saleratus
 *  is on hand it's useless without something to bake in. */
export const NO_COOKWARE_MORALE_HIT = 2;

/** Morale debit when cookware is present but saleratus is gone —
 *  biscuits come out dense (period: "lead in the belly"). */
export const NO_SALERATUS_MORALE_HIT = 1;

export interface PastryQualityResult {
  state: GameState;
  /** What happened today — useful for tests + log diagnostics. */
  outcome: 'no-pastry' | 'normal' | 'no-saleratus' | 'no-cookware';
}

/** Probability of "improvised on a hot rock today" bypass when cookware
 *  is missing. Period: many emigrant diaries record cooking on flat
 *  rocks, in tin pans, or by burying dough in the embers when proper
 *  cookware was unavailable. Prevents the no-cookware path from being
 *  a guaranteed 100% −2 every day — adds variance per Dave's #306
 *  randomness pattern. */
export const NO_COOKWARE_IMPROVISE_CHANCE = 0.1;

/** Run once per tick after `applyDailyConsumption`. Reads
 *  `flags._pastryDrawnLb` (set by consumption when flour or cornmeal
 *  was drawn), checks cookware + saleratus, applies the right modifier.
 *  Idempotent: clears the flag at the end so re-runs (mid-tick refactor
 *  safety) don't double-charge.
 *
 *  When `rng` is provided, no-cookware days roll a small chance to
 *  improvise (no morale debit). When omitted (legacy callers / tests),
 *  the deterministic full-debit path runs.
 *
 *  Out of scope: a "wet firewood / no fire" gate (#143) — if the
 *  party can't light a fire at all, baking is impossible. Folds in
 *  when #143 ships and exposes a "had-fire-tonight" flag the pastry
 *  pass can read. */
export function applyPastryQuality(state: GameState, rng?: Rng): PastryQualityResult {
  const drawnLb = (state.flags._pastryDrawnLb as number | undefined) ?? 0;
  if (drawnLb <= 0) {
    // Clear the flag even on no-op so a stale value doesn't carry
    // across ticks (defensive).
    if (state.flags._pastryDrawnLb !== undefined) {
      const flags = { ...state.flags };
      delete (flags as Record<string, unknown>)._pastryDrawnLb;
      return { state: { ...state, flags }, outcome: 'no-pastry' };
    }
    return { state, outcome: 'no-pastry' };
  }

  const inv = state.inventory;
  const hasCookware = (inv.cookware ?? 0) > 0;
  const saleratusOnHand = inv.saleratus ?? 0;

  const flags = { ...state.flags };
  delete (flags as Record<string, unknown>)._pastryDrawnLb;

  // No cookware — can't bake at all most days. 10% chance to improvise
  // (period: hot-rock baking, tin pans, ember-buried dough). On miss
  // path the day is "ate paste again."
  if (!hasCookware) {
    if (rng && rng.chance(NO_COOKWARE_IMPROVISE_CHANCE)) {
      return {
        state: {
          ...state,
          flags,
          eventLog: [
            ...state.eventLog,
            { day: state.day, text: 'Improvised cooking on a hot rock — biscuits passable.' }
          ]
        },
        outcome: 'normal'
      };
    }
    return {
      state: {
        ...state,
        flags,
        morale: Math.max(0, state.morale - NO_COOKWARE_MORALE_HIT),
        eventLog: [
          ...state.eventLog,
          { day: state.day, text: 'No cookware — ate paste again. Morale −2.' }
        ]
      },
      outcome: 'no-cookware'
    };
  }

  // Cookware on hand — check saleratus.
  if (saleratusOnHand <= 0) {
    return {
      state: {
        ...state,
        flags,
        morale: Math.max(0, state.morale - NO_SALERATUS_MORALE_HIT),
        eventLog: [
          ...state.eventLog,
          { day: state.day, text: 'No saleratus — biscuits sat heavy in the belly. Morale −1.' }
        ]
      },
      outcome: 'no-saleratus'
    };
  }

  // Both present — period-normal mood. Consume saleratus proportionally.
  // Round up to ensure progress so that a properly-budgeted starter kit
  // still depletes on schedule for any seed.
  const consumed = Math.max(0.01, drawnLb * SALERATUS_LB_PER_PASTRY_LB);
  const remaining = Math.max(0, saleratusOnHand - consumed);
  return {
    state: {
      ...state,
      flags,
      inventory: { ...inv, saleratus: remaining }
    },
    outcome: 'normal'
  };
}
