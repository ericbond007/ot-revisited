import { describe, it, expect } from 'vitest';
import { rest } from '../src/lib/game/actions/rest';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'camp-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [
      { name: 'B', profession: 'doctor' },
      { name: 'C', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Clamp the party's morale to a mid range so we can see swings.
  return { ...s, morale: 50 };
}

describe('camp actions', () => {
  it('pass_whiskey consumes 1 whiskey and writes a log line', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, whiskey: 2 } };
    const out = rest(s, 1, { campActions: ['pass_whiskey'] });
    expect(out.inventory.whiskey).toBe(1);
    const log = out.eventLog.map((e) => e.text).join('\n').toLowerCase();
    expect(log).toMatch(/whiskey|shouting|bottle/);
  });

  it('pass_whiskey throws when party has no whiskey', () => {
    const s = { ...newGame(), inventory: { flour: 100 } };
    expect(() => rest(s, 1, { campActions: ['pass_whiskey'] })).toThrow(/whiskey/i);
  });

  it('big_meal consumes 4 lb of food and boosts morale + health', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, flour: 50, beans: 50 } };
    const out = rest(s, 1, { campActions: ['big_meal'] });
    const foodBefore = (s.inventory.flour ?? 0) + (s.inventory.beans ?? 0);
    const foodAfter = (out.inventory.flour ?? 0) + (out.inventory.beans ?? 0);
    // Day also consumes daily rations; we just check big meal removed
    // its additional 4 lb on top of that.
    expect(foodBefore - foodAfter).toBeGreaterThanOrEqual(4);
    expect(out.morale).toBeGreaterThan(s.morale);
  });

  it('sing_along requires a harmonica or fiddle', () => {
    const s = { ...newGame(), inventory: { flour: 100 } };
    expect(() => rest(s, 1, { campActions: ['sing_along'] })).toThrow(/harmonica|fiddle/i);

    const withHarmonica = { ...newGame(), inventory: { ...newGame().inventory, harmonica: 1 } };
    const out = rest(withHarmonica, 1, { campActions: ['sing_along'] });
    expect(out.morale).toBeGreaterThan(withHarmonica.morale);
  });

  it('cure_meat converts game_meat into jerky (higher yield with salt)', () => {
    // Note: daily consumption eats fresh game_meat first (foodDrawOrder 0),
    // so the cure-input pile is smaller than the starting amount. Assert
    // the conversion ratio rather than a fixed number.

    // No salt — 0.7× conversion.
    const s1 = { ...newGame(), inventory: { ...newGame().inventory, game_meat: 1000 } };
    const out1 = rest(s1, 1, { campActions: ['cure_meat'] });
    expect(out1.inventory.game_meat).toBe(0);
    const jerky1 = out1.inventory.jerky ?? 0;
    expect(jerky1).toBeGreaterThan(600);
    expect(jerky1).toBeLessThan(720);

    // With salt — 0.85× conversion, consumes 1 salt.
    const s2 = { ...newGame(), inventory: { ...newGame().inventory, game_meat: 1000, salt: 3 } };
    const out2 = rest(s2, 1, { campActions: ['cure_meat'] });
    expect(out2.inventory.game_meat).toBe(0);
    const jerky2 = out2.inventory.jerky ?? 0;
    expect(jerky2).toBeGreaterThan(800);
    expect(jerky2).toBeLessThan(880);
    expect(jerky2).toBeGreaterThan(jerky1); // salt yields more
    expect(out2.inventory.salt).toBe(2);
  });

  it('cure_meat clears the spoil-day flag when the meat pile is gone', () => {
    const s = {
      ...newGame(),
      inventory: { ...newGame().inventory, game_meat: 50 },
      flags: { ...newGame().flags, _gameMeatSpoilDay: 10 }
    };
    const out = rest(s, 1, { campActions: ['cure_meat'] });
    expect(out.inventory.game_meat).toBe(0);
    expect(out.flags._gameMeatSpoilDay).toBeUndefined();
  });

  it('multiple camp actions stack within the 12-hour budget', () => {
    const s = {
      ...newGame(),
      inventory: {
        ...newGame().inventory,
        whiskey: 1, flour: 50, bible: 1, harmonica: 1
      }
    };
    // 1 + 2 + 1 + 2 = 6 hours — well under budget.
    const out = rest(s, 1, {
      campActions: ['pass_whiskey', 'big_meal', 'read_bible', 'sing_along']
    });
    // All four should have fired — morale should be well above baseline.
    expect(out.morale).toBeGreaterThan(s.morale + 5);
  });

  it('rejects camp actions that bust the 12-hour budget', () => {
    // dig_well (5) + cure_meat (6, no salt) + sing_along (2) = 13 hours.
    const s = {
      ...newGame(),
      inventory: {
        ...newGame().inventory,
        shovel: 1, game_meat: 10, harmonica: 1
      }
    };
    expect(() =>
      rest(s, 1, { campActions: ['dig_well', 'cure_meat', 'sing_along'] })
    ).toThrow(/budget/i);
  });

  it('shovel actions still work as camp actions (merged registry)', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 } };
    const out = rest(s, 1, { campActions: ['dig_grave'] });
    const log = out.eventLog.map((e) => e.text).join('\n');
    expect(log.toLowerCase()).toMatch(/grave/);
  });
});
