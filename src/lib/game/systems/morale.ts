import type { GameState } from '../types';
import type { Rng } from '../rng';
import { foodItemIds } from '../content/items';
import { hasLiveWhore, hasLiveTeacher } from '../professions/predicates';

// Whore keeps morale from cratering — +15% floor while she's alive in the party.
export const WHORE_MORALE_FLOOR = 15;

export function moraleFloorFor(state: GameState): number {
  return hasLiveWhore(state) ? WHORE_MORALE_FLOOR : 0;
}

export function healingMultiplier(morale: number): number {
  if (morale >= 80) return 1.25;
  if (morale >= 60) return 1.10;
  if (morale >= 40) return 1.00;
  if (morale >= 20) return 0.90;
  // #922 — softened from 0.75 to 0.90 to break the death-spiral lock.
  // The previous 0.75 floor compounded condition damage at low morale
  // and trapped 73/75 bot runs in a calendar-burn rest-loop (see #917).
  return 0.90;
}

function totalFood(state: GameState): number {
  return foodItemIds().reduce((sum, k) => sum + (state.inventory[k] ?? 0), 0);
}

export function adjustMorale(state: GameState, _rng: Rng): GameState {
  let delta = 0;
  const food = totalFood(state);

  if (state.rations === 'filling') delta += 1;
  else if (state.rations === 'meager') delta -= 1;

  if (food <= 0) {
    delta -= 3;
  } else if (state.rations === 'normal') {
    // wellness feedback: +1 if every living member has >70 health
    const allAboveSeventy = state.party.every((m) => m.dead || m.health > 70);
    if (allAboveSeventy && state.party.some((m) => !m.dead)) {
      delta += 1;
    }
  }

  // A dog's daily company — small, steady +1. Stacks with any
  // profession / rations / wellness bumps above.
  if (state.dog) delta += 1;

  // #176 — wagon-train companionship. Period diaries (Bryant 1846,
  // Carpenter 1857) describe caravan rhythm — shared cooking,
  // Saturday-night fiddle around the central fire — as the single
  // biggest morale lift outside of arrival itself. Steady +1/day
  // while in a train.
  if (state.wagonTrain) delta += 1;

  // #317a — teacher + primer (McGuffey's Reader). The schoolmarm
  // reading aloud at camp was a documented morale lift in mixed-age
  // emigrant trains; Tabitha Brown founded Pacific University from
  // exactly this dynamic. Requires both the teacher AND the primer —
  // the teacher without a book has nothing to read; the book without
  // a teacher just collects dust.
  if (hasLiveTeacher(state) && (state.inventory.primer ?? 0) > 0) {
    delta += 1;
  }

  const floor = moraleFloorFor(state);
  const morale = Math.max(floor, Math.min(100, state.morale + delta));
  return { ...state, morale };
}
