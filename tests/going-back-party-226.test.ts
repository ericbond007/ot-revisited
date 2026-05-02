import { describe, it, expect } from 'vitest';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'gbp-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

const ENC = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_going_back_party')!;

describe('#226 going-back party encounter', () => {
  it('exists with the new id and title', () => {
    expect(ENC).toBeDefined();
    expect(ENC.title).toMatch(/going-back/i);
    expect(ENC.category).toBe('encounter');
  });

  it('gate fires only once west of mile 500', () => {
    const earlyState = { ...newGame(), location: { ...newGame().location, milesTraveled: 100 } };
    const lateState = { ...newGame(), location: { ...newGame().location, milesTraveled: 800 } };
    expect(ENC.gate).toBeDefined();
    expect(ENC.gate!(earlyState)).toBe(false);
    expect(ENC.gate!(lateState)).toBe(true);
  });

  it('has 5 choices: trade, buy_trade_goods, mail_home, listen, pass', () => {
    // buy_trade_goods (#216 follow-up) added so going-back parties can
    // offload their trinket box at a discount.
    const ids = ENC.choices.map((c) => c.id).sort();
    expect(ids).toEqual(['buy_trade_goods', 'listen', 'mail_home', 'pass', 'trade'].sort());
  });

  it('mail_home choice: morale +1, no other state change', () => {
    const choice = ENC.choices.find((c) => c.id === 'mail_home')!;
    const before = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('mail-1'));
    expect(after.morale).toBe(51);
    expect(after.cash).toBe(before.cash);
    expect(after.inventory).toEqual(before.inventory);
  });

  it('mail_home respects morale ceiling at 100', () => {
    const choice = ENC.choices.find((c) => c.id === 'mail_home')!;
    const before = { ...newGame(), morale: 100 };
    const after = choice.apply(before, makeRng('mail-2'));
    expect(after.morale).toBe(100);
  });

  it('mail_home no-ops gracefully if no living adults', () => {
    const choice = ENC.choices.find((c) => c.id === 'mail_home')!;
    const before: GameState = {
      ...newGame(),
      morale: 50,
      party: newGame().party.map((m) => ({ ...m, dead: true }))
    };
    const after = choice.apply(before, makeRng('mail-3'));
    expect(after.morale).toBe(50);
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/no one fit/i);
  });

  it('mail_home log line mentions a letter', () => {
    const choice = ENC.choices.find((c) => c.id === 'mail_home')!;
    const before = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('mail-4'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/letter/i);
  });

  it('trade choice still works (regression on rename)', () => {
    const choice = ENC.choices.find((c) => c.id === 'trade')!;
    const before = { ...newGame(), cash: 50 };
    const after = choice.apply(before, makeRng('trade-1'));
    expect(after.cash).toBe(40);
    expect(after.inventory.flour).toBeGreaterThanOrEqual((before.inventory.flour ?? 0) + 20);
  });
});
