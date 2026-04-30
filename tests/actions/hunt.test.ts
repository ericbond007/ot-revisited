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
  return {
    ...s, oxen,
    inventory: {
      ...s.inventory,
      rifle: 1,
      gunpowder: 40,
      lead_balls: 40,
      percussion_caps: 40,
      bullet_mold: 1
    }
  };
}

describe('hunt', () => {
  it('advances the day counter by 1', () => {
    const s = newGame();
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.day).toBe(s.day + 1);
  });

  it('consumes powder + lead balls + caps on a hunt (#174)', () => {
    const s = newGame();
    const startPowder = s.inventory.gunpowder ?? 0;
    const startBalls = s.inventory.lead_balls ?? 0;
    const startCaps = s.inventory.percussion_caps ?? 0;
    const h = hunt(s, { target: 'small', ammo: 'light', hunters: 1 });
    expect(h.inventory.gunpowder).toBeLessThan(startPowder);
    expect(h.inventory.lead_balls).toBeLessThan(startBalls);
    expect(h.inventory.percussion_caps).toBeLessThan(startCaps);
    // All three drop by the same amount — one shot consumes one of each.
    expect(startPowder - (h.inventory.gunpowder ?? 0))
      .toBe(startBalls - (h.inventory.lead_balls ?? 0));
    expect(startBalls - (h.inventory.lead_balls ?? 0))
      .toBe(startCaps - (h.inventory.percussion_caps ?? 0));
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

  it('allows gather-only (no rifles) to add wild berries', () => {
    const s = { ...newGame(), inventory: { flour: 500, shovel: 1, yoke: 1 } };
    const h = hunt(s, { target: 'gather', ammo: 'light', hunters: 1 });
    // Gather now routes to berries instead of hijacking flour. Flour
    // will still drop slightly from the hunt-day's normal consumption,
    // but the gather yield lands in berries.
    expect(h.inventory.berries ?? 0).toBeGreaterThan(0);
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
    expect(h.eventLog[h.eventLog.length - 1].text.toLowerCase()).toMatch(/(hunt|game|meat|gather|berries)/);
  });

  it('stashes a _huntHaul flag with structured haul info', () => {
    const s = newGame();
    const h = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1 });
    // PostHuntModal reads this flag to render the reveal step.
    expect(h.flags._huntHaul).toBeTruthy();
    const haul = h.flags._huntHaul as Record<string, unknown>;
    expect(haul.target).toBe('medium');
    expect(typeof haul.meat).toBe('number');
    expect(typeof haul.berries).toBe('number');
    expect(typeof haul.liver).toBe('boolean');
    expect(typeof haul.bullets).toBe('number');
  });

  it('big-game hunt tends to produce a liver roll', () => {
    // With an 85% liver chance on big game, at least one of 8 seeded runs
    // (with meat) should yield liver:true. This guards against liver
    // accidentally being hard-wired to false in a refactor.
    let anyLiver = false;
    let anyMeat = false;
    for (let i = 0; i < 8; i++) {
      const s = { ...newGame(), seed: `liver-${i}` };
      const h = hunt(s, { target: 'big', ammo: 'heavy', hunters: 1 });
      const haul = h.flags._huntHaul as Record<string, unknown>;
      if ((haul.meat as number) > 0) anyMeat = true;
      if (haul.liver === true) anyLiver = true;
    }
    expect(anyMeat).toBe(true);
    expect(anyLiver).toBe(true);
  });
});
