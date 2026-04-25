import { describe, it, expect } from 'vitest';
import { applyStarvation } from '../src/lib/game/systems/starvation';
import { applyDailyConsumption } from '../src/lib/game/systems/consumption';
import { reapDead } from '../src/lib/game/systems/death';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  const s = createInitialState({
    seed: 'starve',
    leader: { name: 'Ezra', profession: 'carpenter' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return {
    ...s,
    inventory: {},
    resources: { water: 500, waterCap: 500, firewood: 500 },
    morale: 80
  };
}

describe('starvation', () => {
  it('a fed party never starves — no counter, no condition', () => {
    let s = createInitialState({
      seed: 'fed',
      leader: { name: 'A', profession: 'doctor' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year: 1848, month: 4, day: 15 }
    });
    s = applyDailyConsumption(s);
    s = applyStarvation(s);
    expect(s.flags._starvationDays).toBeUndefined();
    expect(s.party.every((m) => !m.conditions.some((c) => c.id === 'starvation'))).toBe(true);
  });

  it('day 1 of hunger — counter set, condition added, no HP loss yet', () => {
    let s = newGame();
    s = applyDailyConsumption(s);
    s = applyStarvation(s);
    expect(s.flags._starvationDays).toBe(1);
    expect(s.party.every((m) => m.conditions.some((c) => c.id === 'starvation'))).toBe(true);
    // First hungry day costs morale but not HP.
    expect(s.party[0].health).toBe(100);
  });

  it('HP damage scales with consecutive days of hunger', () => {
    let s = newGame();
    const startHp = s.party.reduce((a, m) => a + m.health, 0);
    for (let i = 0; i < 5; i++) {
      s = applyDailyConsumption(s);
      s = applyStarvation(s);
    }
    const endHp = s.party.reduce((a, m) => a + m.health, 0);
    expect(endHp).toBeLessThan(startHp);
    expect(s.flags._starvationDays).toBe(5);
  });

  it('eating clears the counter and the condition', () => {
    let s = newGame();
    s = applyDailyConsumption(s);
    s = applyStarvation(s);
    expect(s.flags._starvationDays).toBe(1);
    // Replenish food.
    s = { ...s, inventory: { ...s.inventory, flour: 100 } };
    s = applyDailyConsumption(s);
    s = applyStarvation(s);
    expect(s.flags._starvationDays).toBeUndefined();
    expect(s.party.every((m) => !m.conditions.some((c) => c.id === 'starvation'))).toBe(true);
  });

  it('a starved member dies with deathCause = "Starvation"', () => {
    let s = newGame();
    // Wound members so they're closer to dying.
    s = { ...s, party: s.party.map((m) => ({ ...m, health: 25 })) };
    // Several days of hunger should kill them.
    for (let i = 0; i < 6; i++) {
      s = applyDailyConsumption(s);
      s = applyStarvation(s);
      s = reapDead(s, makeRng(`starve-${i}`));
    }
    const dead = s.party.filter((m) => m.dead);
    expect(dead.length).toBeGreaterThan(0);
    expect(dead.every((m) => m.deathCause === 'Starvation')).toBe(true);
  });

  it('the recovery line logs when food returns', () => {
    let s = newGame();
    s = applyDailyConsumption(s);
    s = applyStarvation(s);
    s = { ...s, inventory: { flour: 50 } };
    s = applyDailyConsumption(s);
    s = applyStarvation(s);
    const last = s.eventLog[s.eventLog.length - 1];
    expect(last.text.toLowerCase()).toMatch(/full meal|color returns/);
  });
});
