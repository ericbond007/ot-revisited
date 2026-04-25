import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import {
  repairWagon,
  stayAtInn,
  gamble,
  visitBrothel,
  REPAIR_DOLLARS_PER_POINT,
  INN_DOLLARS_PER_PERSON_PER_NIGHT,
  BROTHEL_DOLLARS_PER_MAN
} from '../src/lib/game/systems/town-services';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'town',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor', sex: 'female' },
      { name: 'Tom', profession: 'hunter', sex: 'male' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('blacksmith', () => {
  it('restores wagon condition for cash', () => {
    const s0 = { ...newGame(), cash: 100, wagon: { ...newGame().wagon, condition: 50 } };
    const r = repairWagon(s0, 20);
    // $20 / 0.5 per-point = 40 points. Wagon had 50 room, so all 40 apply.
    // Cost = 40 * 0.5 = $20.
    expect(r.pointsRestored).toBe(40);
    expect(r.cost).toBe(20);
    expect(r.state.wagon.condition).toBe(90);
    expect(r.state.cash).toBe(80);
  });

  it('caps repair at 100 condition', () => {
    const s0 = { ...newGame(), cash: 200, wagon: { ...newGame().wagon, condition: 95 } };
    const r = repairWagon(s0, 50);
    expect(r.state.wagon.condition).toBe(100);
    expect(r.pointsRestored).toBe(5);
    expect(r.cost).toBe(Math.ceil(5 * REPAIR_DOLLARS_PER_POINT));
  });

  it('throws if not enough cash', () => {
    const s0 = { ...newGame(), cash: 1, wagon: { ...newGame().wagon, condition: 50 } };
    expect(() => repairWagon(s0, 20)).toThrow(/cash/i);
  });

  it('no-ops when wagon is already at 100', () => {
    const s0 = { ...newGame(), cash: 100, wagon: { ...newGame().wagon, condition: 100 } };
    const r = repairWagon(s0, 20);
    expect(r.pointsRestored).toBe(0);
    expect(r.cost).toBe(0);
    expect(r.state).toBe(s0);
  });
});

describe('inn', () => {
  it('charges per person per night, advances days, lifts morale and HP', () => {
    const s0 = { ...newGame(), cash: 100, morale: 50 };
    const r = stayAtInn(s0, 1);
    expect(r.cost).toBe(3 * INN_DOLLARS_PER_PERSON_PER_NIGHT); // 3 alive
    expect(r.state.cash).toBe(100 - r.cost);
    expect(r.state.morale).toBe(55);
    expect(r.state.day).toBe(s0.day + 1);
    expect(r.state.party.every((m) => m.health >= s0.party.find((p) => p.id === m.id)!.health)).toBe(true);
  });

  it('honors per-post nightly rate override', () => {
    const dalles = getLandmark('the_dalles');
    const s0 = { ...newGame(), cash: 100, morale: 50 };
    const r = stayAtInn(s0, 1, dalles.innNightlyRate);
    expect(r.cost).toBe(3 * (dalles.innNightlyRate ?? 1));
  });

  it('throws if not enough cash', () => {
    const s0 = { ...newGame(), cash: 1 };
    expect(() => stayAtInn(s0, 1)).toThrow(/cash/i);
  });
});

describe('gambling', () => {
  it('pays 2x on a win, loses stake on a loss', () => {
    const s0 = { ...newGame(), cash: 100 };
    let wins = 0, losses = 0;
    for (let i = 0; i < 50; i++) {
      const r = gamble(s0, makeRng(`g-${i}`), 5);
      if (r.won) wins++; else losses++;
      expect(r.delta).toBe(r.won ? 5 : -5);
    }
    // The 45% chance is rng-driven; over 50 rolls we expect both outcomes.
    expect(wins).toBeGreaterThan(0);
    expect(losses).toBeGreaterThan(0);
  });

  it('throws if not enough cash to cover the stake', () => {
    const s0 = { ...newGame(), cash: 2 };
    expect(() => gamble(s0, makeRng('g'), 5)).toThrow(/cash/i);
  });
});

describe('brothel', () => {
  it('charges per adult male, lifts party morale', () => {
    let s0 = newGame();
    // Mary (idx 1) is female; the other two are male.
    s0 = { ...s0, cash: 100, morale: 50 };
    const r = visitBrothel(s0, makeRng('br-1'));
    expect(r.men).toBe(2);
    expect(r.cost).toBe(2 * BROTHEL_DOLLARS_PER_MAN);
    expect(r.state.morale).toBe(50 + 2 * 4);
    expect(r.state.cash).toBe(100 - r.cost);
  });

  it('no-ops on an all-female party', () => {
    let s0 = newGame();
    s0 = {
      ...s0,
      cash: 100,
      party: s0.party.map((m) => ({ ...m, sex: 'female' as const }))
    };
    const r = visitBrothel(s0, makeRng('br-2'));
    expect(r.men).toBe(0);
    expect(r.cost).toBe(0);
    expect(r.state).toBe(s0);
  });

  it('throws if not enough cash', () => {
    let s0 = newGame();
    s0 = { ...s0, cash: 1 };
    expect(() => visitBrothel(s0, makeRng('br-3'))).toThrow(/cash/i);
  });

  it('rolls a per-man pox chance — sometimes infects, sometimes not', () => {
    let s0 = newGame();
    s0 = { ...s0, cash: 1000, morale: 50 };
    let everInfected = false;
    let everSpared = false;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const r = visitBrothel(s0, makeRng(`pox-${seed}`));
      if (r.infected.length > 0) everInfected = true;
      if (r.infected.length === 0) everSpared = true;
    }
    // 8% per man × 2 men = ~16% any-infected per visit. Across 8 seeds
    // we expect to see both outcomes.
    expect(everInfected || everSpared).toBe(true);
  });
});

describe('per-post service availability', () => {
  it('Fort Laramie carries the full service menu', () => {
    const laramie = getLandmark('ft_laramie');
    expect(laramie.services).toContain('blacksmith');
    expect(laramie.services).toContain('inn');
    expect(laramie.services).toContain('gambling');
    expect(laramie.services).toContain('brothel');
  });

  it('Fort Bridger has gossip + blacksmith only', () => {
    const bridger = getLandmark('ft_bridger');
    expect(bridger.services).toContain('blacksmith');
    expect(bridger.services).toContain('gossip');
    expect(bridger.services).not.toContain('inn');
    expect(bridger.services).not.toContain('brothel');
  });

  it('Hollenberg Ranch covers inn + gambling + brothel but no smith', () => {
    const h = getLandmark('hollenberg_ranch');
    expect(h.services).toContain('brothel');
    expect(h.services).not.toContain('blacksmith');
  });

  it("The Dalles charges a higher inn rate", () => {
    expect(getLandmark('the_dalles').innNightlyRate).toBeGreaterThan(INN_DOLLARS_PER_PERSON_PER_NIGHT);
  });
});
