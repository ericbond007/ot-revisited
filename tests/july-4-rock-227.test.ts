import { describe, it, expect } from 'vitest';
import { getLandmarkArrivalEvent } from '../src/lib/game/content/landmark-arrival-events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGameOnDate(month: number, day: number): GameState {
  return createInitialState({
    seed: 'july-4-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1849, month, day }
  });
}

describe('#227 4th of July at Independence Rock', () => {
  it('arriving on July 4 returns the special set-piece, not the regular sign-the-rock', () => {
    const s = newGameOnDate(7, 4);
    const ev = getLandmarkArrivalEvent('independence_rock', s);
    expect(ev?.id).toBe('arrival_independence_rock_july4');
    expect(ev?.title).toMatch(/Fourth of July/i);
  });

  it('arriving on any other date returns the regular event', () => {
    const s = newGameOnDate(7, 5);
    const ev = getLandmarkArrivalEvent('independence_rock', s);
    expect(ev?.id).toBe('arrival_independence_rock');
  });

  it('the special variant only fires AT the Rock, not at other landmarks on July 4', () => {
    const s = newGameOnDate(7, 4);
    const chimney = getLandmarkArrivalEvent('chimney_rock', s);
    expect(chimney?.id).toBe('arrival_chimney_rock');
  });

  it('called without state, the regular event still resolves (legacy callers)', () => {
    const ev = getLandmarkArrivalEvent('independence_rock');
    expect(ev?.id).toBe('arrival_independence_rock');
  });

  it('salute_and_feast spends 5 each of powder/balls/caps when stocked', () => {
    const s = newGameOnDate(7, 4);
    const ev = getLandmarkArrivalEvent('independence_rock', s)!;
    const choice = ev.choices.find((c) => c.id === 'salute_and_feast')!;
    const stocked: GameState = {
      ...s,
      morale: 50,
      inventory: { ...s.inventory, gunpowder: 30, lead_balls: 30, percussion_caps: 30 }
    };
    const after = choice.apply(stocked, makeRng('salute-1'));
    expect(after.inventory.gunpowder).toBe(25);
    expect(after.inventory.lead_balls).toBe(25);
    expect(after.inventory.percussion_caps).toBe(25);
    expect(after.morale).toBe(60);
  });

  it('salute_and_feast falls back to feast-only when low on ammo', () => {
    const s = newGameOnDate(7, 4);
    const ev = getLandmarkArrivalEvent('independence_rock', s)!;
    const choice = ev.choices.find((c) => c.id === 'salute_and_feast')!;
    const dry: GameState = {
      ...s,
      morale: 50,
      inventory: { ...s.inventory, gunpowder: 0, lead_balls: 0, percussion_caps: 0 }
    };
    const after = choice.apply(dry, makeRng('feast-1'));
    expect(after.inventory.gunpowder ?? 0).toBe(0);
    expect(after.morale).toBe(58);
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/no powder/i);
  });

  it('sign_and_celebrate gives +8 morale, no inventory cost', () => {
    const s = newGameOnDate(7, 4);
    const ev = getLandmarkArrivalEvent('independence_rock', s)!;
    const choice = ev.choices.find((c) => c.id === 'sign_and_celebrate')!;
    const before = { ...s, morale: 50 };
    const after = choice.apply(before, makeRng('dance-1'));
    expect(after.morale).toBe(58);
    expect(after.inventory).toEqual(before.inventory);
  });

  it('press_on gives +3 morale (smaller than the celebration paths)', () => {
    const s = newGameOnDate(7, 4);
    const ev = getLandmarkArrivalEvent('independence_rock', s)!;
    const choice = ev.choices.find((c) => c.id === 'press_on')!;
    const after = choice.apply({ ...s, morale: 50 }, makeRng('press-1'));
    expect(after.morale).toBe(53);
  });

  it('morale ceiling clamps at 100', () => {
    const s = newGameOnDate(7, 4);
    const ev = getLandmarkArrivalEvent('independence_rock', s)!;
    const choice = ev.choices.find((c) => c.id === 'salute_and_feast')!;
    const high: GameState = {
      ...s,
      morale: 95,
      inventory: { ...s.inventory, gunpowder: 30, lead_balls: 30, percussion_caps: 30 }
    };
    const after = choice.apply(high, makeRng('clamp-1'));
    expect(after.morale).toBe(100);
  });
});
