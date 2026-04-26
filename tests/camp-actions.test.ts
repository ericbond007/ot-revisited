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

  it('share_the_whore is unavailable without a Whore in the party', () => {
    const s = newGame(); // farmer/doctor/hunter — no whore
    expect(() => rest(s, 1, { campActions: ['share_the_whore'] })).toThrow(/whore/i);
  });

  it('share_the_whore is unavailable when there are no adult men', () => {
    const s = newGame();
    // All-female party including the whore.
    s.party = s.party.map((m, i) =>
      i === 0
        ? { ...m, profession: 'whore' as const, sex: 'female' as const }
        : { ...m, sex: 'female' as const }
    );
    expect(() => rest(s, 1, { campActions: ['share_the_whore'] })).toThrow(/men/i);
  });

  it('share_the_whore grants +2 morale per alive adult male (or -2 squabble)', () => {
    const s = newGame();
    // 3-person party: whore (female) + 2 male adults.
    s.party[0] = { ...s.party[0], profession: 'whore', sex: 'female' };
    s.party[1] = { ...s.party[1], sex: 'male' };
    s.party[2] = { ...s.party[2], sex: 'male' };
    // Baseline: rest with no camp actions captures the daily morale drift.
    const baseline = rest({ ...s, seed: 'whore-camp' }, 1).morale;
    const withAction = rest({ ...s, seed: 'whore-camp' }, 1, { campActions: ['share_the_whore'] }).morale;
    // Either +4 (2 men × 2) on success or -2 on squabble (12% chance).
    const delta = withAction - baseline;
    expect([4, -2]).toContain(delta);
  });

  it('dig_grave clears _burialPending and lifts morale +2 when shovel present', () => {
    const base = newGame();
    const s = {
      ...base,
      inventory: { ...base.inventory, shovel: 1 },
      flags: { ...base.flags, _burialPending: true },
      morale: 50
    };
    const out = rest(s, 1, { campActions: ['dig_grave'] });
    expect(out.flags._burialPending).toBeUndefined();
    expect(out.morale).toBeGreaterThan(s.morale);
    const log = out.eventLog.map((e) => e.text).join('\n').toLowerCase();
    expect(log).toMatch(/grave/);
  });

  it('dig_grave is a no-op flavor line when no burial is pending', () => {
    // Defensive: UI hides the action without _burialPending, but if it
    // gets called anyway (dev tools, scenarios), it must not grant
    // morale.
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 } };
    const out = rest(s, 1, { campActions: ['dig_grave'] });
    const log = out.eventLog.map((e) => e.text).join('\n').toLowerCase();
    expect(log).toMatch(/nothing to bury/);
    expect(log).not.toMatch(/farewell/);
  });

  it('stashes a _campSummary flag with structured before/after data', () => {
    const s = {
      ...newGame(),
      inventory: { ...newGame().inventory, whiskey: 1, shovel: 1 },
      morale: 40
    };
    const out = rest(s, 2, { campActions: ['pass_whiskey', 'dig_well'] });

    expect(out.flags._campSummary).toBeTruthy();
    const summary = out.flags._campSummary as Record<string, unknown>;

    expect(summary.daysRested).toBe(2);
    expect(summary.startDay).toBe(s.day);

    const morale = summary.morale as { before: number; after: number };
    expect(morale.before).toBe(40);
    expect(typeof morale.after).toBe('number');

    // Activities should list both picked actions.
    const activities = summary.activities as Array<{ id: string }>;
    expect(activities.map((a) => a.id).sort()).toEqual(['dig_well', 'pass_whiskey']);

    // Party + oxen + inventoryDelta are populated.
    const party = summary.party as Array<{ name: string }>;
    expect(party.length).toBe(s.party.length);
    expect((summary.oxen as { alive: number }).alive).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(summary.inventoryDelta)).toBe(true);

    // Whiskey was consumed — it should show up as a negative delta.
    const invDelta = summary.inventoryDelta as Array<{ id: string; delta: number }>;
    const whiskeyRow = invDelta.find((r) => r.id === 'whiskey');
    expect(whiskeyRow?.delta).toBe(-1);
  });
});
