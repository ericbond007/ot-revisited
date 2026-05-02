import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import {
  useBathHouse,
  BATH_HOUSE_DOLLARS_PER_PERSON,
  BATH_HOUSE_CLEANLINESS_BOOST,
  BATH_HOUSE_MORALE_BUMP
} from '../src/lib/game/systems/town-services';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'bath',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor', sex: 'female' },
      { name: 'Tom', profession: 'hunter', sex: 'male' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('#270 bath-house', () => {
  it('charges $1 per alive party member', () => {
    const s0 = { ...newGame(), cash: 100 };
    const r = useBathHouse(s0);
    expect(r.cost).toBe(3 * BATH_HOUSE_DOLLARS_PER_PERSON);
    expect(r.bathed).toBe(3);
    expect(r.state.cash).toBe(100 - r.cost);
  });

  it('does not charge for dead party members', () => {
    const base = newGame();
    const s0: GameState = {
      ...base,
      cash: 100,
      party: base.party.map((m, i) => (i === 0 ? { ...m, dead: true } : m))
    };
    const r = useBathHouse(s0);
    expect(r.bathed).toBe(2);
    expect(r.cost).toBe(2 * BATH_HOUSE_DOLLARS_PER_PERSON);
  });

  it('boosts cleanliness +50 for every alive member, capped at 100', () => {
    const base = newGame();
    const s0: GameState = {
      ...base,
      cash: 100,
      party: base.party.map((m, i) => ({
        ...m,
        cleanliness: i === 0 ? 20 : i === 1 ? 70 : 95
      }))
    };
    const r = useBathHouse(s0);
    expect(r.state.party[0].cleanliness).toBe(20 + BATH_HOUSE_CLEANLINESS_BOOST);
    expect(r.state.party[1].cleanliness).toBe(100);
    expect(r.state.party[2].cleanliness).toBe(100);
  });

  it('does not touch dead members\' cleanliness', () => {
    const base = newGame();
    const s0: GameState = {
      ...base,
      cash: 100,
      party: base.party.map((m, i) => (i === 0 ? { ...m, dead: true, cleanliness: 5 } : m))
    };
    const r = useBathHouse(s0);
    expect(r.state.party[0].cleanliness).toBe(5);
  });

  it('lifts morale +4 (capped at 100)', () => {
    const s0 = { ...newGame(), cash: 100, morale: 60 };
    const r = useBathHouse(s0);
    expect(r.state.morale).toBe(60 + BATH_HOUSE_MORALE_BUMP);
  });

  it('caps morale at 100', () => {
    const s0 = { ...newGame(), cash: 100, morale: 99 };
    const r = useBathHouse(s0);
    expect(r.state.morale).toBe(100);
  });

  it('throws if not enough cash', () => {
    const s0 = { ...newGame(), cash: 1 };
    expect(() => useBathHouse(s0)).toThrow(/cash/i);
  });

  it('no-ops when whole party is dead', () => {
    const base = newGame();
    const s0: GameState = {
      ...base,
      cash: 100,
      party: base.party.map((m) => ({ ...m, dead: true }))
    };
    const r = useBathHouse(s0);
    expect(r.bathed).toBe(0);
    expect(r.cost).toBe(0);
    expect(r.state).toBe(s0);
  });

  it('appends an event-log entry recording the soak', () => {
    const s0 = { ...newGame(), cash: 100 };
    const r = useBathHouse(s0);
    const last = r.state.eventLog[r.state.eventLog.length - 1];
    expect(last.text).toMatch(/bath-house/i);
    expect(last.day).toBe(s0.day);
  });
});

describe('#270 bath-house landmark stocking', () => {
  it('Ft Laramie offers a bath-house', () => {
    const laramie = getLandmark('ft_laramie');
    expect(laramie.services ?? []).toContain('bath_house');
  });

  it('The Dalles offers a bath-house', () => {
    const dalles = getLandmark('the_dalles');
    expect(dalles.services ?? []).toContain('bath_house');
  });

  it('small forts (Bridger, Boise) do not offer a bath-house', () => {
    expect(getLandmark('ft_bridger').services ?? []).not.toContain('bath_house');
    expect(getLandmark('ft_boise').services ?? []).not.toContain('bath_house');
  });
});
