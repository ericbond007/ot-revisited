import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import {
  getGrudge,
  adjustGrudge,
  activeGrudges,
  hasFestering
} from '../src/lib/game/systems/grudges';
import { PARTY_EVENTS } from '../src/lib/game/content/party-events';
import { resolveEvent } from '../src/lib/game/systems/events';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'grudge',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('grudge state', () => {
  it('starts at 0 for any pair', () => {
    const s = newGame();
    expect(getGrudge(s, s.party[0].id, s.party[1].id)).toBe(0);
  });

  it('is symmetric — pair key sorted', () => {
    const s = newGame();
    const [a, b] = s.party;
    const s1 = adjustGrudge(s, a.id, b.id, 15);
    expect(getGrudge(s1, a.id, b.id)).toBe(15);
    expect(getGrudge(s1, b.id, a.id)).toBe(15);
  });

  it('clamps to [0, 100]', () => {
    const s = newGame();
    const [a, b] = s.party;
    const high = adjustGrudge(s, a.id, b.id, 999);
    expect(getGrudge(high, a.id, b.id)).toBe(100);
    const low = adjustGrudge(high, a.id, b.id, -999);
    expect(getGrudge(low, a.id, b.id)).toBe(0);
  });

  it('removes pair entry once it reaches 0', () => {
    const s0 = newGame();
    const [a, b] = s0.party;
    const s1 = adjustGrudge(s0, a.id, b.id, 10);
    expect(activeGrudges(s1).length).toBe(1);
    const s2 = adjustGrudge(s1, a.id, b.id, -10);
    expect(activeGrudges(s2).length).toBe(0);
  });

  it('hasFestering ignores grudges with dead members', () => {
    const s0 = newGame();
    const [a, b] = s0.party;
    let s1 = adjustGrudge(s0, a.id, b.id, 50);
    expect(hasFestering(s1, 25)).toBe(true);
    // Kill member b.
    s1 = { ...s1, party: s1.party.map((m) => m.id === b.id ? { ...m, dead: true } : m) };
    expect(hasFestering(s1, 25)).toBe(false);
  });
});

describe('party events', () => {
  it('registers 5 personal events', () => {
    expect(PARTY_EVENTS.length).toBe(5);
    expect(PARTY_EVENTS.every((e) => e.category === 'personal')).toBe(true);
  });

  it('food-hoarding accusation creates grudge between two adults', () => {
    const s0 = newGame();
    const ev = PARTY_EVENTS.find((e) => e.id === 'party_food_hoarding')!;
    const after = resolveEvent(s0, ev, 'mediate', makeRng('food'));
    expect(activeGrudges(after).length).toBe(1);
    expect(activeGrudges(after)[0].level).toBeGreaterThan(0);
  });

  it('fistfight gate fails without a festering pair', () => {
    const s = newGame();
    const ev = PARTY_EVENTS.find((e) => e.id === 'party_fistfight')!;
    expect(ev.gate?.(s) ?? true).toBe(false);
  });

  it('fistfight gate passes with a festering pair', () => {
    let s = newGame();
    s = adjustGrudge(s, s.party[0].id, s.party[1].id, 40);
    const ev = PARTY_EVENTS.find((e) => e.id === 'party_fistfight')!;
    expect(ev.gate?.(s) ?? true).toBe(true);
  });

  it('break-up choice damages both members and bumps grudge', () => {
    let s0 = newGame();
    s0 = adjustGrudge(s0, s0.party[0].id, s0.party[1].id, 40);
    const before0 = s0.party[0].health;
    const before1 = s0.party[1].health;
    const ev = PARTY_EVENTS.find((e) => e.id === 'party_fistfight')!;
    const after = resolveEvent(s0, ev, 'break_up', makeRng('break'));
    // The picked pair takes -4 each — at least one of these should be lower.
    const hp0 = after.party[0].health;
    const hp1 = after.party[1].health;
    expect(hp0 + hp1).toBeLessThan(before0 + before1);
  });

  it('reconciliation choice mends the grudge', () => {
    let s0 = newGame();
    s0 = adjustGrudge(s0, s0.party[0].id, s0.party[1].id, 40);
    const ev = PARTY_EVENTS.find((e) => e.id === 'party_reconciliation')!;
    const after = resolveEvent(s0, ev, 'accept', makeRng('rec'));
    expect(getGrudge(after, s0.party[0].id, s0.party[1].id)).toBeLessThan(40);
  });

  it('romance gate needs at least one female + one male adult', () => {
    const s = newGame();
    const ev = PARTY_EVENTS.find((e) => e.id === 'party_romance')!;
    // Default party from helper is all male — so gate should fail.
    const allMale = { ...s, party: s.party.map((m) => ({ ...m, sex: 'male' as const })) };
    expect(ev.gate?.(allMale) ?? true).toBe(false);
    // Mark Mary female (she's the doctor at index 1).
    const mixed = { ...s, party: s.party.map((m, i) => i === 1 ? { ...m, sex: 'female' as const } : { ...m, sex: 'male' as const }) };
    expect(ev.gate?.(mixed) ?? true).toBe(true);
  });
});
