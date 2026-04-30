import { describe, it, expect } from 'vitest';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'rawhide-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, inventory: {} };
}

describe('patch_wagon camp action (#196 C)', () => {
  const action = getCampAction('patch_wagon');

  it('is unavailable without a raw hide', () => {
    const s = { ...newGame(), wagon: { ...newGame().wagon, condition: 80 } };
    expect(action.availability(s).available).toBe(false);
  });

  it('is unavailable when wagon is sound', () => {
    const s = newGame();
    const ready = {
      ...s,
      wagon: { ...s.wagon, condition: 100 },
      inventory: { raw_hide: 1 }
    };
    expect(action.availability(ready).available).toBe(false);
  });

  it('consumes 1 hide and bumps wagon condition by 5', () => {
    const s = newGame();
    const ready = {
      ...s,
      wagon: { ...s.wagon, condition: 80 },
      inventory: { raw_hide: 2 }
    };
    const next = action.apply(ready, makeRng('patch:1'));
    expect(next.inventory.raw_hide).toBe(1);
    expect(next.wagon.condition).toBe(85);
  });

  it('does not exceed 100 condition', () => {
    const s = newGame();
    const nearFull = {
      ...s,
      wagon: { ...s.wagon, condition: 98 },
      inventory: { raw_hide: 1 }
    };
    const next = action.apply(nearFull, makeRng('patch:2'));
    expect(next.wagon.condition).toBe(100);
  });
});

describe('stitch_moccasins camp action (#196 D)', () => {
  const action = getCampAction('stitch_moccasins');

  it('is unavailable without a raw hide', () => {
    expect(action.availability(newGame()).available).toBe(false);
  });

  it('is available with raw hide alone — no profession or post gating', () => {
    // Period emigrants stitched their own moccasins with awl + sinew;
    // no specialist required.
    const s = newGame();
    const ready = { ...s, inventory: { raw_hide: 1 } };
    expect(action.availability(ready).available).toBe(true);
  });

  it('converts 1 raw_hide → 1 moccasins', () => {
    const s = newGame();
    const ready = { ...s, inventory: { raw_hide: 2 } };
    const next = action.apply(ready, makeRng('stitch:1'));
    expect(next.inventory.raw_hide).toBe(1);
    expect(next.inventory.moccasins).toBe(1);
  });

  it('stacks on existing moccasins', () => {
    const s = newGame();
    const ready = { ...s, inventory: { raw_hide: 1, moccasins: 3 } };
    const next = action.apply(ready, makeRng('stitch:2'));
    expect(next.inventory.moccasins).toBe(4);
  });
});
