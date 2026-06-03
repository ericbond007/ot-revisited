import type { GameState } from '../types';
import { setSpoilClock } from './spoilage';

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
  // Refresh the egg spoil clock on every lay: fresh eggs from today
  // reset the freshness window, so a pile only spoils once the hens
  // stop laying for EGG_FRESH_DAYS (died / sold off). Matches the
  // "none laid in two weeks" log copy.
  const withEggs: GameState = {
    ...state,
    inventory: {
      ...state.inventory,
      egg: (state.inventory.egg ?? 0) + laid
    }
  };
  return setSpoilClock(withEggs, 'egg');
}
