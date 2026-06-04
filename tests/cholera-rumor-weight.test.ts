import { describe, it, expect } from 'vitest';
import { effectiveWeight } from '../src/lib/game/systems/events';
import { EVENTS } from '../src/lib/game/content/events';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

const cholera = EVENTS.find((e) => e.id === 'health_cholera')!;
function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'cholera',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 6, day: 2 }
  });
  return { ...s, ...over };
}

describe('#150 cholera rumor window bumps the cholera event weight', () => {
  it('the cholera event exists with id health_cholera', () => {
    expect(cholera).toBeTruthy();
  });
  it('base weight with no rumor active', () => {
    const s = game({ day: 5 });
    expect(effectiveWeight(cholera, s)).toBeCloseTo(cholera.weight);
  });
  it('1.5x weight while the rumor window is open', () => {
    const s = game({ day: 5, flags: { _choleraHintedUntilDay: 10 } });
    expect(effectiveWeight(cholera, s)).toBeCloseTo(cholera.weight * 1.5);
  });
  it('back to base once the rumor window has passed', () => {
    const s = game({ day: 20, flags: { _choleraHintedUntilDay: 10 } });
    expect(effectiveWeight(cholera, s)).toBeCloseTo(cholera.weight);
  });
});
