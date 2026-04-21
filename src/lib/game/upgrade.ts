import type { GameState, GameStateFlag } from './types';

const DEFAULT_FLAGS: Record<GameStateFlag, boolean> = {
  hasBoilingKnowledge: false,
  hadFireLastNight: false
};

export function upgradeState(state: GameState): GameState {
  const flags = { ...DEFAULT_FLAGS, ...state.flags };
  return { ...state, flags };
}
