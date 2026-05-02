import { describe, it, expect } from 'vitest';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { EVENTS } from '../src/lib/game/content/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import { adjustTribeAttitude, getTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import type { GameState } from '../src/lib/game/types';

const salmon = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_native_salmon')!;

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'salmon-239',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1849, month: 8, day: 1 }
  });
  return { ...s, ...over };
}

/** Place the wagon at a Snake/Columbia mile with tribes friendly enough. */
function inSalmonCorridor(over: Partial<GameState> = {}): GameState {
  // mile 1500 lands inside Bannock (1100-1400 — wait let me pick further)
  // 1500 → Nez Perce (1400-1700). Baseline 70 (already friendly+).
  const base = newGame();
  return {
    ...base,
    location: { ...base.location, milesTraveled: 1500 },
    inventory: { ...base.inventory, beads: 5, tobacco: 3, fishing_line: 2 },
    ...over
  };
}

describe('#239 salmon-trade encounter — registry', () => {
  it('is registered in ENCOUNTER_EVENTS', () => {
    expect(salmon).toBeDefined();
  });

  it('appears in the global EVENTS pool', () => {
    expect(EVENTS.find((e) => e.id === 'encounter_native_salmon')).toBeDefined();
  });

  it('has all four choices', () => {
    const ids = salmon.choices.map((c) => c.id);
    expect(ids).toEqual(['trade_fishhook', 'trade_tobacco', 'trade_beads', 'wave_off']);
  });
});

describe('#239 salmon-trade — gating', () => {
  it('does NOT fire before mile 1200 (Snake corridor start)', () => {
    const s: GameState = inSalmonCorridor({
      location: { ...newGame().location, milesTraveled: 1100 }
    });
    expect(salmon.gate?.(s)).toBe(false);
  });

  it('does NOT fire past mile 2050 (Columbia exit)', () => {
    const s: GameState = inSalmonCorridor({
      location: { ...newGame().location, milesTraveled: 2100 }
    });
    expect(salmon.gate?.(s)).toBe(false);
  });

  it('fires at mile 1500 (Nez Perce friendly territory)', () => {
    const s = inSalmonCorridor();
    expect(salmon.gate?.(s)).toBe(true);
  });

  it('does NOT fire when no trade goods on hand', () => {
    const s: GameState = inSalmonCorridor({
      inventory: { ...newGame().inventory, beads: 0, tobacco: 0, fishing_line: 0 }
    });
    expect(salmon.gate?.(s)).toBe(false);
  });

  it('does NOT fire when nearby tribes are hostile', () => {
    let s = inSalmonCorridor();
    // Drag Nez Perce attitude below 41.
    s = adjustTribeAttitude(s, 'nez_perce', -50);
    expect(getTribeAttitude(s, 'nez_perce')).toBeLessThan(41);
    expect(salmon.gate?.(s)).toBe(false);
  });
});

describe('#239 trade_fishhook outcome', () => {
  const choice = salmon.choices.find((c) => c.id === 'trade_fishhook')!;

  it('spends 1 fishing_line, gains 8 lb game_meat (no Indian Trader)', () => {
    const before = inSalmonCorridor();
    const after = choice.apply(before, makeRng('hook'));
    expect(after.inventory.fishing_line).toBe(1);
    expect(after.inventory.game_meat).toBe((before.inventory.game_meat ?? 0) + 8);
  });

  it('Indian Trader bumps yield to 12 lb', () => {
    const baseTrader = createInitialState({
      seed: 'trader',
      leader: { name: 'Iz', profession: 'indian_trader' },
      companions: [{ name: 'Mary', profession: 'farmer' }],
      startDate: { year: 1849, month: 8, day: 1 }
    });
    const before: GameState = {
      ...baseTrader,
      location: { ...baseTrader.location, milesTraveled: 1500 },
      inventory: { ...baseTrader.inventory, fishing_line: 2 }
    };
    const after = choice.apply(before, makeRng('trader-hook'));
    expect(after.inventory.game_meat).toBe((before.inventory.game_meat ?? 0) + 12);
  });

  it('refreshes the game_meat spoil clock (3 days)', () => {
    const before = inSalmonCorridor();
    const after = choice.apply(before, makeRng('hook'));
    expect(after.flags._gameMeatSpoilDay).toBe(before.day + 3);
  });

  it('bumps tribe relations by +3', () => {
    const before = inSalmonCorridor();
    const beforeAtt = getTribeAttitude(before, 'nez_perce');
    const after = choice.apply(before, makeRng('hook'));
    expect(getTribeAttitude(after, 'nez_perce')).toBe(beforeAtt + 3);
  });

  it('writes a salmon-named log line', () => {
    const before = inSalmonCorridor();
    const after = choice.apply(before, makeRng('hook'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/salmon/i);
  });
});

describe('#239 trade_tobacco outcome', () => {
  const choice = salmon.choices.find((c) => c.id === 'trade_tobacco')!;

  it('spends 1 tobacco, gains 5 lb', () => {
    const before = inSalmonCorridor();
    const after = choice.apply(before, makeRng('tobacco'));
    expect(after.inventory.tobacco).toBe(2);
    expect(after.inventory.game_meat).toBe((before.inventory.game_meat ?? 0) + 5);
  });
});

describe('#239 trade_beads outcome', () => {
  const choice = salmon.choices.find((c) => c.id === 'trade_beads')!;

  it('spends 2 beads, gains 4 lb', () => {
    const before = inSalmonCorridor();
    const after = choice.apply(before, makeRng('beads'));
    expect(after.inventory.beads).toBe(3);
    expect(after.inventory.game_meat).toBe((before.inventory.game_meat ?? 0) + 4);
  });

  it('no-ops gracefully when only 1 bead is on hand', () => {
    const before: GameState = {
      ...inSalmonCorridor(),
      inventory: { ...inSalmonCorridor().inventory, beads: 1 }
    };
    const after = choice.apply(before, makeRng('beads-short'));
    // Beads unchanged, no salmon yielded.
    expect(after.inventory.beads).toBe(1);
    expect(after.inventory.game_meat ?? 0).toBe(before.inventory.game_meat ?? 0);
  });
});

describe('#239 wave_off outcome', () => {
  const choice = salmon.choices.find((c) => c.id === 'wave_off')!;

  it('drops relations by 1', () => {
    const before = inSalmonCorridor();
    const beforeAtt = getTribeAttitude(before, 'nez_perce');
    const after = choice.apply(before, makeRng('wave'));
    expect(getTribeAttitude(after, 'nez_perce')).toBe(beforeAtt - 1);
  });

  it('does NOT yield game_meat', () => {
    const before = inSalmonCorridor();
    const after = choice.apply(before, makeRng('wave'));
    expect(after.inventory.game_meat ?? 0).toBe(before.inventory.game_meat ?? 0);
  });
});
