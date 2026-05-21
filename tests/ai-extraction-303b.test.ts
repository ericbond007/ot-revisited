// #303b — lift-and-shift three small AI bits from src/lib/dev/bot/runner.ts
// to src/lib/game/ai/ so the same decision logic can drive future NPC
// hunting (Joe Meek profile), shared rest-camp chain decisions, and
// reusable companion priority.
//
// Pure code move — behavior is preserved. These tests pin the exposed
// decisions so the move can't silently regress.

import { describe, it, expect } from 'vitest';
import { pickHuntTarget } from '../src/lib/game/ai/hunt';
import { defaultCompanions, COMPANION_PRIORITY } from '../src/lib/game/ai/party';
import { pickRestCampChain } from '../src/lib/game/ai/rest';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: '303b',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

describe('#303b — pickHuntTarget (terrain → target+ammo)', () => {
  it('prairie + ammo plenty → big game, moderate ammo', () => {
    const s = game();
    const state: GameState = {
      ...s,
      location: { ...s.location, terrain: 'prairie' },
      inventory: { ...s.inventory, gunpowder: 50, lead_balls: 50, percussion_caps: 50 }
    };
    expect(pickHuntTarget(state)).toEqual({ target: 'big', ammo: 'moderate' });
  });
  it('forest → medium game, moderate ammo (regardless of ammo)', () => {
    const s = game();
    const state: GameState = { ...s, location: { ...s.location, terrain: 'forest' } };
    expect(pickHuntTarget(state)).toEqual({ target: 'medium', ammo: 'moderate' });
  });
  it('prairie + lean ammo → small game, light ammo (no-ammo fallback)', () => {
    const s = game();
    const state: GameState = {
      ...s,
      location: { ...s.location, terrain: 'prairie' },
      inventory: { ...s.inventory, gunpowder: 5, lead_balls: 5, percussion_caps: 5 }
    };
    expect(pickHuntTarget(state)).toEqual({ target: 'small', ammo: 'light' });
  });
  it('mountains → small + light (default fallback)', () => {
    const s = game();
    const state: GameState = { ...s, location: { ...s.location, terrain: 'mountains' } };
    expect(pickHuntTarget(state)).toEqual({ target: 'small', ammo: 'light' });
  });
});

describe('#303b — defaultCompanions (party-size + leader → professions)', () => {
  it('returns partySize-1 picks skipping the leader profession', () => {
    const r = defaultCompanions(4, 'farmer');
    expect(r).toHaveLength(3);
    expect(r).not.toContain('farmer'); // farmer leader → no farmer until pad
  });
  it('skips the leader and pads with farmer if priority runs out', () => {
    // Leader = doctor (top of priority); want 5 picks from [doctor, hunter, teamster, blacksmith, scout]
    // → 4 priority picks minus doctor = [hunter, teamster, blacksmith, scout], then pad with farmer to reach 5.
    const r = defaultCompanions(6, 'doctor');
    expect(r).toEqual(['hunter', 'teamster', 'blacksmith', 'scout', 'farmer']);
  });
  it('clamps partySize to [1, 6] → companions in [0, 5]', () => {
    expect(defaultCompanions(1, 'farmer')).toEqual([]);
    expect(defaultCompanions(99, 'farmer')).toHaveLength(5);
    expect(defaultCompanions(0, 'farmer')).toEqual([]);
  });
  it('COMPANION_PRIORITY exposes the canonical order', () => {
    expect(COMPANION_PRIORITY).toEqual(['doctor', 'hunter', 'teamster', 'blacksmith', 'scout']);
  });
});

describe('#303b — pickRestCampChain (rest-day water chain decision)', () => {
  it('desert + shovel → dig_well first, then find_water fallback', () => {
    const s = game();
    const state: GameState = {
      ...s,
      location: { ...s.location, terrain: 'desert' },
      inventory: { ...s.inventory, shovel: 1 },
      resources: { ...s.resources, firewood: 0 }
    };
    const chains = pickRestCampChain(state);
    expect(chains[0]).toEqual(['dig_well']);
    expect(chains[chains.length - 1]).toEqual(['find_water']);
  });
  it('boil-capable + low firewood → gather_firewood + find_water + boil_water first', () => {
    const s = game();
    const state: GameState = {
      ...s,
      flags: { ...s.flags, hasBoilingKnowledge: true },
      resources: { ...s.resources, firewood: 0 }
    };
    const chains = pickRestCampChain(state);
    expect(chains[0]).toEqual(['gather_firewood', 'find_water', 'boil_water']);
  });
  it('boil-capable + ample firewood → find_water + boil_water', () => {
    const s = game();
    const state: GameState = {
      ...s,
      flags: { ...s.flags, hasBoilingKnowledge: true },
      resources: { ...s.resources, firewood: 10 }
    };
    const chains = pickRestCampChain(state);
    expect(chains).toContainEqual(['find_water', 'boil_water']);
  });
  it('no boil capability → find_water alone', () => {
    const s = game();
    // Default 1849 game, no hasBoilingKnowledge flag, no doctor → cannot boil.
    expect(pickRestCampChain(s)).toEqual([['find_water']]);
  });
});
