// #921 — aggressivePersona.shouldRest only fired on minPartyHealth<20
// or oxenWornOut. That HP floor is too low to catch chronic-disease
// and exposure spirals: a member running cholera (−7/day) or dysentery
// (−3/day, "survivable with 2-3 days rest" per #161) who has already
// reached HP<20 dies within 1-3 ticks — the bot never stopped in time
// (sample: 5 dysentery + 3 exposure wipes / 100 aggressive runs).
//
// The fix raises the rest floor ONLY when a real spiral is underway,
// so a healthy party still gets aggressive's push (over-resting
// craters arrival — the D3/D4 lesson):
//  - any severe disease (cholera/typhoid/dysentery) + HP already < 35
//  - cold high-passes (mountains terrain) + thin warmth gear + HP < 35

import { describe, it, expect } from 'vitest';
import { aggressivePersona } from '../src/lib/game/ai';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, Terrain } from '../src/lib/game/types';
import type { ConditionId } from '../src/lib/game/types';

/** aggressive.shouldRest ignores rng; the Persona interface still
 *  requires it (sundayRester/pacePusher delegate with one). */
const rest = (s: GameState) => aggressivePersona.shouldRest(s, makeRng('r'));
const rations = (s: GameState) => aggressivePersona.pickRations(s, makeRng('r'));

function game(): GameState {
  return createInitialState({
    seed: 'p',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

/** Set party member 0's HP (drives minPartyHealth — member 1 stays 100). */
function hp(s: GameState, value: number): GameState {
  return { ...s, party: s.party.map((m, i) => (i === 0 ? { ...m, health: value } : m)) };
}

function cond(s: GameState, id: ConditionId): GameState {
  return {
    ...s,
    party: s.party.map((m, i) =>
      i === 0 ? { ...m, conditions: [{ id, daysSinceOnset: 2 }] } : m
    )
  };
}

function terrain(s: GameState, t: Terrain): GameState {
  return { ...s, location: { ...s.location, terrain: t } };
}

function inv(s: GameState, inventory: Record<string, number>): GameState {
  return { ...s, inventory };
}

describe('#921 — aggressive.shouldRest baseline (unchanged)', () => {
  it('healthy party on the prairie does NOT rest (push preserved)', () => {
    expect(rest(game())).toBe(false);
  });

  it('still rests on the HP<20 emergency floor', () => {
    expect(rest(hp(game(), 15))).toBe(true);
  });
});

describe('#921 — severe-condition trigger', () => {
  it('dysentery + HP 30 (<35) → rests (was false before #921)', () => {
    expect(rest(cond(hp(game(), 30), 'dysentery'))).toBe(true);
  });

  it('cholera + HP 28 → rests', () => {
    expect(rest(cond(hp(game(), 28), 'cholera'))).toBe(true);
  });

  it('typhoid + HP 34 → rests', () => {
    expect(rest(cond(hp(game(), 34), 'typhoid'))).toBe(true);
  });

  it('dysentery but HP 60 (>=35) → still pushes (coping party, no over-rest)', () => {
    expect(rest(cond(hp(game(), 60), 'dysentery'))).toBe(false);
  });

  it('HP 30 with NO severe condition → still pushes (aggressive ≠ cautious)', () => {
    expect(rest(hp(game(), 30))).toBe(false);
  });

  it('measles (not in the severe set) + HP 30 → still pushes', () => {
    expect(rest(cond(hp(game(), 30), 'measles'))).toBe(false);
  });
});

// #921r — post-shock recovery rebalance. The dominant aggressive
// failure was 68% STRANDED (not death): a desert dehydration / ox loss
// then a limping wagon (~15 vs 19 mi/day) on meager rations + no rest,
// never recovering, until the 220-day season ran out. Fix: plan
// properly (safetyFactor 1.0→1.2), don't cheap out on rations, and
// rest the team/party back to a workable minimum before pushing on.

function fatigueAll(s: GameState, f: number): GameState {
  return { ...s, oxen: s.oxen.map((o) => ({ ...o, fatigue: f })) };
}

describe('#921r — planning: foresight safetyFactor', () => {
  it('lifted 1.0 → 1.2 (competent planning, still fast pace)', () => {
    expect(aggressivePersona.foresight.safetyFactor).toBe(1.2);
    expect(aggressivePersona.foresight.paceMiPerDay).toBe(12);
  });
});

describe('#921r — rations: feed recovery, stay lean otherwise', () => {
  it('healthy party eats meager (lean default — period-true, stretches larder)', () => {
    expect(rations(game())).toBe('meager');
    expect(rations(inv(game(), { flour: 500 }))).toBe('meager');
  });

  it('a recovering member (min HP < 40) with food on hand eats normal', () => {
    expect(rations(hp(game(), 35))).toBe('normal');
  });

  it('recovering but food is the emergency (<40 lb) → still meager', () => {
    const s = inv(hp(game(), 35), { flour: 20 });
    expect(rations(s)).toBe('meager');
  });

  it('min HP 45 (>=40, not recovering) → meager', () => {
    expect(rations(hp(game(), 45))).toBe('meager');
  });
});

describe('#921r — recover to a workable minimum', () => {
  it('HP 25 (<28), no disease, fresh oxen → rests (was push pre-#921r)', () => {
    expect(rest(hp(game(), 25))).toBe(true);
  });

  it('HP 30 (>=28), no disease, fresh oxen → still pushes (no over-rest)', () => {
    expect(rest(hp(game(), 30))).toBe(false);
  });

  it('oxenTired (avg fatigue 60: >50 soft, <=70 worn) → rests preemptively', () => {
    const s = fatigueAll(game(), 60);
    expect(rest(s)).toBe(true);
  });

  it('fresh oxen + full HP → still pushes (baseline intact)', () => {
    expect(rest(fatigueAll(game(), 0))).toBe(false);
  });
});

describe('#921 — cold-high-passes exposure trigger', () => {
  it('mountains + thin warmth + HP 30 → rests', () => {
    const s = inv(terrain(hp(game(), 30), 'mountains'), {});
    expect(rest(s)).toBe(true);
  });

  it('mountains + good warmth (>=50) + HP 30 → still pushes', () => {
    const s = inv(terrain(hp(game(), 30), 'mountains'), { coat: 2, blanket: 2 });
    expect(rest(s)).toBe(false);
  });

  it('prairie + thin warmth + HP 30 → still pushes (terrain-gated)', () => {
    const s = inv(terrain(hp(game(), 30), 'prairie'), {});
    expect(rest(s)).toBe(false);
  });

  it('mountains + thin warmth but HP 60 (>=35) → still pushes (HP-gated)', () => {
    const s = inv(terrain(hp(game(), 60), 'mountains'), {});
    expect(rest(s)).toBe(false);
  });
});
