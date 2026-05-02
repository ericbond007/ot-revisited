import { describe, it, expect } from 'vitest';
import { getLandmarkArrivalEvent } from '../src/lib/game/content/landmark-arrival-events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'cliff-test',
    leader: { name: 'Ezra Thompson', profession: 'farmer' },
    companions: [{ name: 'Mary Thompson', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 20 }
  });
}

describe('#228 Register Cliff inscription persistence', () => {
  const ev = getLandmarkArrivalEvent('register_cliff')!;

  it('event has 3 choices: sign, carve, pass', () => {
    const ids = ev.choices.map((c) => c.id).sort();
    expect(ids).toEqual(['carve', 'pass', 'sign']);
  });

  it('carve sets _registerCliffInscription with leader name + month + year', () => {
    const choice = ev.choices.find((c) => c.id === 'carve')!;
    const before = newGame();
    const after = choice.apply(before, makeRng('carve-1'));
    expect(after.flags._registerCliffInscription).toBe('EZRA THOMPSON · Jun 1849');
  });

  it('carve also gives +5 morale (regression)', () => {
    const choice = ev.choices.find((c) => c.id === 'carve')!;
    const before = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('carve-2'));
    expect(after.morale).toBe(55);
  });

  it('sign does NOT set the inscription flag', () => {
    const choice = ev.choices.find((c) => c.id === 'sign')!;
    const after = choice.apply(newGame(), makeRng('sign-1'));
    expect(after.flags._registerCliffInscription).toBeUndefined();
  });

  it('pass does NOT set the inscription flag', () => {
    const choice = ev.choices.find((c) => c.id === 'pass')!;
    const after = choice.apply(newGame(), makeRng('pass-1'));
    expect(after.flags._registerCliffInscription).toBeUndefined();
  });

  it('inscription survives serialization round-trip', async () => {
    const choice = ev.choices.find((c) => c.id === 'carve')!;
    const before = newGame();
    const after = choice.apply(before, makeRng('round-1'));
    const { serialize, deserialize } = await import('../src/lib/game/saves');
    const restored = deserialize(serialize(after));
    expect(restored.flags._registerCliffInscription).toBe('EZRA THOMPSON · Jun 1849');
  });

  it('format uses three-letter month abbreviation', () => {
    const choice = ev.choices.find((c) => c.id === 'carve')!;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let m = 1; m <= 12; m++) {
      const s: GameState = { ...newGame(), date: { ...newGame().date, month: m } };
      const after = choice.apply(s, makeRng(`m-${m}`));
      expect(after.flags._registerCliffInscription).toContain(months[m - 1]);
    }
  });
});
