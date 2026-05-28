import { describe, expect, it } from 'vitest';
import { resolveWheelBreak } from '../src/lib/game/systems/wheel-break';
import { createInitialState } from '../src/lib/game/engine';
import type { Rng } from '../src/lib/game/rng';

function stateFor(opts: { blacksmith: boolean; condition: number }) {
  const s = createInitialState({
    seed: 'rebuild-929',
    leader: { name: 'L', profession: opts.blacksmith ? 'blacksmith' : 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'teacher', sex: 'female' }],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
  s.wagon.condition = opts.condition;
  s.inventory.wheel = 0;
  return s;
}

function fixedRng(value: number): Rng {
  return {
    next: () => value,
    chance: (p: number) => value < p,
    pick: <T>(arr: T[]) => arr[0],
    int: (min: number, max: number) => Math.floor(value * (max - min + 1)) + min
  };
}

describe('resolveWheelBreak — rebuild RNG roll table', () => {
  it('Blacksmith + cond>=30: threshold 0.90', () => {
    const s = stateFor({ blacksmith: true, condition: 60 });
    const success = resolveWheelBreak(s, fixedRng(0.89), 'rebuild');
    expect(success.state.wagon.impairment).toBeNull();
    expect(success.state.wagon.condition).toBe(75);
    expect(success.state.day).toBe(s.day + 1);

    const failure = resolveWheelBreak(s, fixedRng(0.91), 'rebuild');
    expect(failure.state.wagon.impairment).not.toBeNull();
    expect(failure.state.wagon.condition).toBe(60);
    expect(failure.state.day).toBe(s.day + 1);
  });

  it('Blacksmith + cond<30: threshold 0.70', () => {
    const s = stateFor({ blacksmith: true, condition: 20 });
    expect(resolveWheelBreak(s, fixedRng(0.69), 'rebuild').state.wagon.impairment).toBeNull();
    expect(resolveWheelBreak(s, fixedRng(0.71), 'rebuild').state.wagon.impairment).not.toBeNull();
  });

  it('No Blacksmith + cond>=30: threshold 0.70, 2 days', () => {
    const s = stateFor({ blacksmith: false, condition: 60 });
    const success = resolveWheelBreak(s, fixedRng(0.69), 'rebuild');
    expect(success.state.wagon.impairment).toBeNull();
    expect(success.state.day).toBe(s.day + 2);

    const failure = resolveWheelBreak(s, fixedRng(0.71), 'rebuild');
    expect(failure.state.wagon.impairment).not.toBeNull();
    expect(failure.state.day).toBe(s.day + 2);
  });

  it('No Blacksmith + cond<30: threshold 0.50', () => {
    const s = stateFor({ blacksmith: false, condition: 20 });
    expect(resolveWheelBreak(s, fixedRng(0.49), 'rebuild').state.wagon.impairment).toBeNull();
    expect(resolveWheelBreak(s, fixedRng(0.51), 'rebuild').state.wagon.impairment).not.toBeNull();
  });

  it('success log mentions days; failure log mentions limp', () => {
    const s = stateFor({ blacksmith: false, condition: 60 });
    expect(resolveWheelBreak(s, fixedRng(0.1), 'rebuild').log).toMatch(/rebuilt.*2 days/i);
    expect(resolveWheelBreak(s, fixedRng(0.9), 'rebuild').log).toMatch(/limp/i);
  });
});
