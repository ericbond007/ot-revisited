import type { GameState } from '../types';
import type { Rng } from '../rng';

export function healingMultiplier(morale: number): number {
  if (morale >= 80) return 1.25;
  if (morale >= 60) return 1.10;
  if (morale >= 40) return 1.00;
  if (morale >= 20) return 0.90;
  return 0.75;
}

const FOOD_KEYS = ['flour', 'beans', 'bacon', 'hardtack', 'dried_fruit', 'pemmican'];
function totalFood(state: GameState): number {
  return FOOD_KEYS.reduce((sum, k) => sum + (state.inventory[k] ?? 0), 0);
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

  const morale = Math.max(0, Math.min(100, state.morale + delta));
  return { ...state, morale };
}
