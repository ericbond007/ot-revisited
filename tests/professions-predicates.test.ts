import { describe, it, expect } from 'vitest';
import {
  aliveOf,
  hasLive,
  hasLiveDoctor,
  hasLiveFarmer,
  hasLiveHunter,
  hasLiveGunsmith,
  hasLiveMerchant,
  hasLiveBanker,
  hasLivePreacher
} from '../src/lib/game/professions/predicates';
import { createInitialState } from '../src/lib/game/engine';
import type { ProfessionId } from '../src/lib/game/types';

function game(leaderProfession: ProfessionId, companionProfession: ProfessionId) {
  return createInitialState({
    seed: 'pred',
    leader: { name: 'A', profession: leaderProfession },
    companions: [{ name: 'B', profession: companionProfession }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('hasLive<Profession>', () => {
  it('returns true when a matching member is alive', () => {
    const s = game('farmer', 'doctor');
    expect(hasLiveFarmer(s)).toBe(true);
    expect(hasLiveDoctor(s)).toBe(true);
  });

  it('returns false when a matching member is dead', () => {
    const s = game('farmer', 'doctor');
    s.party[0].dead = true;
    expect(hasLiveFarmer(s)).toBe(false);
    expect(hasLiveDoctor(s)).toBe(true);
  });

  it('returns false when no one has that profession', () => {
    const s = game('farmer', 'doctor');
    expect(hasLiveHunter(s)).toBe(false);
    expect(hasLiveGunsmith(s)).toBe(false);
  });
});

describe('aliveOf / hasLive (generic)', () => {
  it('aliveOf lists alive members of a profession', () => {
    const s = game('farmer', 'farmer');
    const farmers = aliveOf(s, 'farmer');
    expect(farmers).toHaveLength(2);
    s.party[1].dead = true;
    expect(aliveOf(s, 'farmer')).toHaveLength(1);
  });

  it('hasLive(state, id) is a generic predicate', () => {
    const s = game('merchant', 'banker');
    expect(hasLive(s, 'merchant')).toBe(true);
    expect(hasLive(s, 'banker')).toBe(true);
    expect(hasLive(s, 'scout')).toBe(false);
  });
});
