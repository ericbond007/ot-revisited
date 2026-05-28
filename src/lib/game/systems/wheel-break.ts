import { consumeWagonPart } from '../professions/bonuses';
import type { GameState } from '../types';
import type { Rng } from '../rng';

export type WheelBreakChoice = 'spare' | 'rebuild' | 'push_on';

export interface WheelBreakResult {
  state: GameState;
  log: string;
}

/**
 * Resolve a wagon_wheel event with the chosen branch. Shared by the
 * player event modal and the NPC daily wheel-break path. See spec at
 * docs/superpowers/specs/2026-05-27-929-wheel-3choice-ladder-design.md.
 */
export function resolveWheelBreak(
  state: GameState,
  rng: Rng,
  choice: WheelBreakChoice
): WheelBreakResult {
  switch (choice) {
    case 'spare':
      return resolveSpare(state, rng);
    case 'rebuild':
      throw new Error('rebuild branch not yet implemented');
    case 'push_on':
      return resolvePushOn(state);
  }
}

function resolveSpare(state: GameState, rng: Rng): WheelBreakResult {
  const { state: afterConsume, saved } = consumeWagonPart(state, rng, 'wheel');
  const conditionUp = Math.min(100, afterConsume.wagon.condition + 10);
  const next: GameState = {
    ...afterConsume,
    wagon: { ...afterConsume.wagon, condition: conditionUp, impairment: null }
  };
  const log = saved
    ? 'The carpenter pieced the old spare wheel back together — no spare consumed. Wagon condition +10.'
    : 'Mounted a spare wheel. Wagon condition +10.';
  return { state: next, log };
}

function resolvePushOn(state: GameState): WheelBreakResult {
  const next: GameState = {
    ...state,
    wagon: {
      ...state.wagon,
      impairment: {
        kind: 'wheel',
        paceMult: 0.5,
        conditionDecayMult: 2,
        contractedAt: { day: state.day, mile: state.location.milesTraveled }
      }
    }
  };
  return {
    state: next,
    log: 'Pushed on with a busted wheel. The wagon limps until the next blacksmith.'
  };
}
