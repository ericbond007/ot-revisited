import type { GameState } from '../types';

// Daily egg lay from the wagon's chickens. Historically 1 hen laid
// ~every other day on trail conditions (poor feed, stress), so we
// model it as one egg per two hens per day. Heavy pace or travel days
// with bad weather could skip the lay — not modeled yet; keep it
// steady for now.
//
// Runs AFTER consumption (same tick the party eats eggs, they'd be
// from yesterday's lay — but we apply before reap so today's lay
// counts toward tomorrow's draw).

export function applyEggLay(state: GameState): GameState {
  const chickens = state.inventory.chicken ?? 0;
  if (chickens <= 0) return state;
  const laid = Math.floor(chickens / 2);
  if (laid <= 0) return state;
  return {
    ...state,
    inventory: {
      ...state.inventory,
      egg: (state.inventory.egg ?? 0) + laid
    }
  };
}
