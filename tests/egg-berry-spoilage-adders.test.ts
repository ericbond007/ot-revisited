import { describe, it, expect } from 'vitest';
import { applyEggLay } from '../src/lib/game/systems/eggs';
import { applySpoilage, EGG_FRESH_DAYS, BERRY_FRESH_DAYS, setSpoilClock } from '../src/lib/game/systems/spoilage';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

// Regression for the dead-wiring bug: SPOIL_RULES defined egg/berry decay
// clocks, but no production code ever SET them, so eggs and berries
// accumulated forever. These tests drive the real adders (applyEggLay,
// setSpoilClock) instead of hand-injecting the flag, so they fail on the
// pre-fix tree.
function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'egg-berry-spoil',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

describe('egg spoilage is actually wired (applyEggLay sets the clock)', () => {
  it('applyEggLay sets _eggSpoilDay to day + EGG_FRESH_DAYS when hens lay', () => {
    const s = game({ day: 10, inventory: { chicken: 4 } });
    const next = applyEggLay(s);
    expect(next.inventory.egg).toBeGreaterThan(0);
    expect(next.flags._eggSpoilDay).toBe(10 + EGG_FRESH_DAYS);
  });

  it('eggs spoil once hens stop laying for EGG_FRESH_DAYS', () => {
    // Hens lay on day 10, then are gone (no relay). Eggs should rot.
    let s = applyEggLay(game({ day: 10, inventory: { chicken: 4 } }));
    const eggs = s.inventory.egg ?? 0;
    expect(eggs).toBeGreaterThan(0);
    s = { ...s, inventory: { ...s.inventory, chicken: 0 }, day: 10 + EGG_FRESH_DAYS + 6 };
    s = applySpoilage(s);
    expect(s.inventory.egg).toBe(0);
    expect(s.eventLog.at(-1)?.text).toMatch(/egg/i);
  });

  it('fresh daily lay keeps refreshing the clock so eggs do NOT rot', () => {
    let s = game({ day: 10, inventory: { chicken: 4 } });
    for (let d = 10; d < 10 + EGG_FRESH_DAYS + 5; d++) {
      s = { ...s, day: d };
      s = applySpoilage(s);   // spoil check runs before lay
      s = applyEggLay(s);     // hens re-lay, refreshing the clock
    }
    expect(s.inventory.egg).toBeGreaterThan(0);
  });
});

describe('berry spoilage is actually wired', () => {
  it('berries rot BERRY_FRESH_DAYS after a clock is set by an adder', () => {
    let s = game({ day: 5, inventory: { berries: 8 } });
    s = setSpoilClock(s, 'berries'); // what rest/hunt now do at the adder site
    expect(s.flags._berrySpoilDay).toBe(5 + BERRY_FRESH_DAYS);
    s = { ...s, day: 5 + BERRY_FRESH_DAYS + 4 };
    s = applySpoilage(s);
    expect(s.inventory.berries).toBe(0);
    expect(s.eventLog.at(-1)?.text).toMatch(/berries/i);
  });
});
