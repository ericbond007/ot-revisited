// #910 — generous-driven food sharing at company camp.
//
// At a sabbath/maintenance lay-by, a generous NPC wagon (Donner
// archetype: distributed food until reserves ran out) hands food to
// the player wagon + boosts player morale. Once per company-decision
// block; skipped when the giver is untended (you don't share what you
// don't have); player travels-only lay-bys (crisis_layby, travel) do
// not trigger.

import { describe, it, expect } from 'vitest';
import { applyTrainShare, SHARE_MORALE_PLAYER } from '../src/lib/game/systems/train-share';
import { generousPersona, balancedPersona, cautiousPersona } from '../src/lib/game/ai/personas';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

const always = makeRng('always');
// Override chance to true so the persona's 60% gate doesn't flake:
(always as unknown as { chance: (p: number) => boolean }).chance = () => true;
const never = makeRng('never');
(never as unknown as { chance: (p: number) => boolean }).chance = () => false;

function npc(opts: { persona: string; flour?: number; morale?: number; party?: 'tended' | 'untended' } = { persona: 'generous' }): NpcWagonState {
  const base = createInitialState({
    seed: 'sh910',
    leader: { name: 'N', profession: 'farmer' },
    companions: [{ name: 'M', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    id: `w-${opts.persona}`,
    name: opts.persona === 'generous' ? 'the Donner party' : `the ${opts.persona} party`,
    seed: 'sh910',
    personaId: opts.persona,
    party: base.party,
    wagon: base.wagon,
    oxen: base.oxen,
    dog: undefined,
    inventory: opts.party === 'untended' ? {} : { flour: opts.flour ?? 100 },
    cash: 0,
    water: opts.party === 'untended' ? 0 : 30,
    waterCap: 40,
    dirtyWater: 0,
    morale: opts.morale ?? 60,
    rations: 'normal',
    spoilDays: {},
    dryDays: 0,
    greaseMiles: 0,
    starvationDays: 0,
    outcome: 'in-progress',
    eventLog: [],
    leaderProfession: 'farmer',
    hasChildren: false
  } as unknown as NpcWagonState;
}

function stateWithTrain(opts: {
  blockMode?: 'sabbath_layby' | 'maintenance_layby' | 'crisis_layby' | 'travel';
  shared?: boolean;
  companions?: NpcWagonState[];
  noTrain?: boolean;
  playerFlour?: number;
} = {}): GameState {
  const s = createInitialState({
    seed: 'sh910-pl',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  const base: GameState = {
    ...s,
    morale: 50,
    inventory: { ...s.inventory, flour: opts.playerFlour ?? 20 }
  };
  if (opts.noTrain) return base;
  return {
    ...base,
    wagonTrain: {
      id: 'tr1', name: 'Test Train', joinedDay: 1, joinedAtLandmarkId: null,
      leaderId: 'npc',
      doctrine: 'prudent',
      companions: opts.companions ?? [npc({ persona: 'generous', flour: 100 })],
      companyDecisionBlock: opts.blockMode
        ? { mode: opts.blockMode, blockStartDay: 5, ...(opts.shared ? { sharedThisBlock: true } : {}) }
        : undefined
    } as unknown as GameState['wagonTrain']
  };
}

describe('#910 — generous persona shouldShareWithTrain', () => {
  it('generous + ample flour + tended + winning roll → returns flour share', () => {
    const s = createInitialState({
      seed: 'g910',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    const state: GameState = {
      ...s, morale: 60, inventory: { flour: 100 },
      resources: { ...s.resources, water: 20 }
    };
    const out = generousPersona.shouldShareWithTrain(state, always);
    expect(out).toEqual({ item: 'flour', qty: 10 });
  });
  it('generous + untended (no food) → null', () => {
    const s = createInitialState({
      seed: 'g910u', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    const state: GameState = { ...s, morale: 10, inventory: {}, resources: { ...s.resources, water: 0 } };
    expect(generousPersona.shouldShareWithTrain(state, always)).toBeNull();
  });
  it('generous + tended but flour reserve too low → null', () => {
    const s = createInitialState({
      seed: 'g910l', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    const state: GameState = {
      ...s, morale: 60, inventory: { flour: 30 },
      resources: { ...s.resources, water: 20 }
    };
    expect(generousPersona.shouldShareWithTrain(state, always)).toBeNull();
  });
  it('generous + losing roll → null (probabilistic gate)', () => {
    const s = createInitialState({
      seed: 'g910r', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    const state: GameState = {
      ...s, morale: 60, inventory: { flour: 100 },
      resources: { ...s.resources, water: 20 }
    };
    expect(generousPersona.shouldShareWithTrain(state, never)).toBeNull();
  });
  it('balanced/cautious return null even with ample flour (only generous shares)', () => {
    const s = createInitialState({
      seed: 'g910b', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    const state: GameState = {
      ...s, morale: 60, inventory: { flour: 100 },
      resources: { ...s.resources, water: 20 }
    };
    expect(balancedPersona.shouldShareWithTrain(state, always)).toBeNull();
    expect(cautiousPersona.shouldShareWithTrain(state, always)).toBeNull();
  });
});

describe('#910 — applyTrainShare engine system', () => {
  it('sabbath_layby + generous NPC + ample flour → transfers, +morale, news entry, dedup flag set', () => {
    const before = stateWithTrain({ blockMode: 'sabbath_layby' });
    const after = applyTrainShare(before, always);
    const beforeFlour = before.inventory.flour ?? 0;
    expect(after.inventory.flour).toBe(beforeFlour + 10);
    expect(after.morale).toBe(Math.min(100, before.morale + SHARE_MORALE_PLAYER));
    expect(after.wagonTrain?.companions[0].inventory.flour).toBe(90);
    expect(after.wagonTrain?.companyDecisionBlock?.sharedThisBlock).toBe(true);
    expect(after.eventLog.at(-1)?.text).toMatch(/Donner/);
    expect(after.eventLog.at(-1)?.text).toMatch(/flour/);
  });
  it('maintenance_layby triggers sharing too', () => {
    const before = stateWithTrain({ blockMode: 'maintenance_layby' });
    const after = applyTrainShare(before, always);
    expect(after.inventory.flour).toBeGreaterThan(before.inventory.flour ?? 0);
  });
  it('crisis_layby does NOT trigger (period: in a crisis you guard, not give)', () => {
    const before = stateWithTrain({ blockMode: 'crisis_layby' });
    expect(applyTrainShare(before, always)).toBe(before);
  });
  it('travel block does NOT trigger (no camp gathering to share at)', () => {
    const before = stateWithTrain({ blockMode: 'travel' });
    expect(applyTrainShare(before, always)).toBe(before);
  });
  it('already-shared this block → dedup, no second transfer', () => {
    const before = stateWithTrain({ blockMode: 'sabbath_layby', shared: true });
    expect(applyTrainShare(before, always)).toBe(before);
  });
  it('no train → no-op', () => {
    const before = stateWithTrain({ noTrain: true });
    expect(applyTrainShare(before, always)).toBe(before);
  });
  it('no generous NPC in train → no-op', () => {
    const before = stateWithTrain({
      blockMode: 'sabbath_layby',
      companions: [npc({ persona: 'balanced', flour: 100 }), npc({ persona: 'hoarder', flour: 100 })]
    });
    expect(applyTrainShare(before, always)).toBe(before);
  });
  it('generous NPC but flour reserve too low → no transfer', () => {
    const before = stateWithTrain({
      blockMode: 'sabbath_layby',
      companions: [npc({ persona: 'generous', flour: 30 })]
    });
    expect(applyTrainShare(before, always)).toBe(before);
  });
});
