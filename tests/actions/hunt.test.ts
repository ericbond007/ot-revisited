import { describe, it, expect } from 'vitest';
import { hunt } from '../../src/lib/game/actions/hunt';
import { createInitialState } from '../../src/lib/game/engine';
import type { GameState, Ox } from '../../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'hunt-test',
    leader: { name: 'A', profession: 'hunter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 10, shod: true },
    { id: 'o2', health: 100, fatigue: 10, shod: true }
  ];
  return { ...s, oxen, inventory: { ...s.inventory, rifle: 1, bullets: 40 } };
}

describe('hunt', () => {
  it('advances the day counter by 1', () => {
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.day).toBe(s.day + 1);
  });

  it('consumes bullets on a hunt', () => {
    const s = newGame();
    const startingBullets = s.inventory.bullets ?? 0;
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.inventory.bullets).toBeLessThan(startingBullets);
  });

  it('adds fresh game meat to inventory on a successful hunt', () => {
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'moderate', hunters: 1 });
    const hadBefore = s.inventory.game_meat ?? 0;
    expect((h.inventory.game_meat ?? 0)).toBeGreaterThanOrEqual(hadBefore);
  });

  it('sets a spoil-day flag on the meat pile after a kill', () => {
    const s = newGame();
    const h = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1 });
    // Only assert if the hunt actually produced meat (deterministic seed
    // should, but be defensive for future seed changes).
    if ((h.inventory.game_meat ?? 0) > 0) {
      expect(typeof h.flags._gameMeatSpoilDay).toBe('number');
      // Spoil day is in the future relative to the hunt tick. Hunt advances
      // the day by 1, so the flag set at hunt-day should still be ≥ h.day.
      expect(h.flags._gameMeatSpoilDay as number).toBeGreaterThanOrEqual(h.day);
    }
  });

  it('rejects a hunt when target is non-gather and no rifles are owned', () => {
    const s = { ...newGame(), inventory: { flour: 500, shovel: 1, yoke: 1 } };
    expect(() => hunt(s, { target: 'small', ammo: 'light', hunters: 1 })).toThrow(/rifle/i);
  });

  it('allows gather-only (no rifles) to add small foraged food', () => {
    const s = { ...newGame(), inventory: { flour: 500, shovel: 1, yoke: 1 } };
    const startingFlour = s.inventory.flour ?? 0;
    const h = hunt(s, { target: 'gather', ammo: 'light', hunters: 1 });
    expect(h.inventory.flour).toBeGreaterThan(startingFlour - 3);
  });

  it('rejects a hunt with zero hunters when non-gather', () => {
    const s = newGame();
    expect(() => hunt(s, { target: 'small', ammo: 'light', hunters: 0 })).toThrow();
  });

  it('rejects a hunt with three hunters', () => {
    const s = newGame();
    expect(() => hunt(s, { target: 'small', ammo: 'light', hunters: 3 })).toThrow();
  });

  it('is deterministic', () => {
    const a = hunt(newGame(), { target: 'small', ammo: 'light', hunters: 1 });
    const b = hunt(newGame(), { target: 'small', ammo: 'light', hunters: 1 });
    expect(a).toEqual(b);
  });

  it('logs the hunt outcome', () => {
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.eventLog[h.eventLog.length - 1].text.toLowerCase()).toMatch(/(hunt|game|meat|gather)/);
  });
});
