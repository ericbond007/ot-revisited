import { describe, it, expect } from 'vitest';
import type { WagonTrain, CaptainDoctrine, CompanyRestMode } from '../src/lib/game/types';

describe('#1046 C1 — serialized types', () => {
  it('WagonTrain carries a doctrine + optional decision block', () => {
    const wt: WagonTrain = {
      id: 't', name: 'Co', joinedDay: 1, joinedAtLandmarkId: null,
      leaderId: 'player', companions: [],
      doctrine: 'prudent',
      companyDecisionBlock: { mode: 'travel', blockStartDay: 1 }
    };
    expect(wt.doctrine).toBe('prudent');
    expect(wt.companyDecisionBlock?.mode).toBe('travel');
  });

  it('the doctrine + mode unions have exactly the spec values', () => {
    const doctrines: CaptainDoctrine[] = ['hard_driver', 'prudent', 'devout'];
    const modes: CompanyRestMode[] =
      ['travel', 'sabbath_layby', 'maintenance_layby', 'crisis_layby'];
    expect(doctrines).toHaveLength(3);
    expect(modes).toHaveLength(4);
  });
});

import { personaToDoctrine } from '../src/lib/game/systems/company-rest';
import type { PersonaId } from '../src/lib/game/ai/types';

describe('#1046 C1 — personaToDoctrine', () => {
  const cases: Array<[PersonaId | undefined, string]> = [
    ['aggressive', 'hard_driver'],
    ['pace_pusher', 'hard_driver'],
    ['cautious', 'devout'],
    ['faithful', 'devout'],
    ['sunday_rester', 'devout'],
    ['balanced', 'prudent'],
    ['hoarder', 'prudent'],
    ['generous', 'prudent'],
    ['drinker', 'prudent'],
    ['chaos', 'prudent'],
    [undefined, 'prudent']
  ];
  for (const [persona, doctrine] of cases) {
    it(`${persona ?? 'undefined'} → ${doctrine}`, () => {
      expect(personaToDoctrine(persona)).toBe(doctrine);
    });
  }
});

import { trainAggregate } from '../src/lib/game/systems/company-rest';
import { createInitialState } from '../src/lib/game/engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function gameInTrain(): GameState {
  const s = createInitialState({
    seed: 'agg', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  const train = generateTrain('agg', 1, null, makeRng('agg'), { fresh: true });
  return { ...s, wagonTrain: train };
}

describe('#1046 C1 — trainAggregate', () => {
  it('min party HP spans player + all companion wagons', () => {
    const s = gameInTrain();
    s.wagonTrain!.companions[0].party[0].health = 12;
    const a = trainAggregate(s);
    expect(a.minPartyHP).toBeLessThanOrEqual(12);
  });

  it('avg ox-fatigue spans player + all companion oxen', () => {
    const s = gameInTrain();
    s.oxen.forEach((o) => (o.fatigue = 80));
    s.wagonTrain!.companions.forEach((w) => w.oxen.forEach((o) => (o.fatigue = 80)));
    const a = trainAggregate(s);
    expect(a.avgOxFatigue).toBeGreaterThan(75);
  });

  it('solo (no train) aggregates the player wagon only', () => {
    // createInitialState requires >=2 adults; a valid party with NO
    // wagonTrain exercises the player-only path (companions ?? []).
    const s = createInitialState({
      seed: 'p', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    s.party[0].health = 40; // the other adult stays 100 → min = 40
    expect(s.wagonTrain).toBeNull(); // createInitialState sets null, not undefined
    expect(trainAggregate(s).minPartyHP).toBe(40);
  });
});

import { companyRestDecision, DOCTRINE_PARAMS } from '../src/lib/game/systems/company-rest';

function withDoctrine(s: GameState, d: CaptainDoctrine): GameState {
  return { ...s, wagonTrain: { ...s.wagonTrain!, doctrine: d } };
}

describe('#1046 C1 — companyRestDecision: crisis floor', () => {
  const ALL: CaptainDoctrine[] = ['hard_driver', 'prudent', 'devout'];
  it('min HP < 20 → crisis_layby for EVERY doctrine (even hard_driver)', () => {
    for (const d of ALL) {
      const s = withDoctrine(gameInTrain(), d);
      s.party[0].health = 15;
      const dec = companyRestDecision(s);
      expect(dec.mode).toBe('crisis_layby');
    }
  });
  it('DOCTRINE_PARAMS has all three doctrines', () => {
    for (const d of ALL) expect(DOCTRINE_PARAMS[d]).toBeDefined();
  });
});

describe('#1046 C1 — companyRestDecision: Sabbath', () => {
  it('devout + Sunday + healthy → sabbath_layby', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    expect(companyRestDecision(s).mode).toBe('sabbath_layby');
  });
  it('devout + non-Sunday + healthy → travel (no Sabbath today)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 18 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
  it('prudent + Sunday → travel (secular company keeps no Sabbath)', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 17 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
  it('crisis still beats Sabbath (devout + Sunday + dying → crisis)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    s.party[0].health = 15;
    expect(companyRestDecision(s).mode).toBe('crisis_layby');
  });
});

describe('#1046 C1 — companyRestDecision: maintenance + hysteresis', () => {
  function tiredTrain(d: CaptainDoctrine, fatigue: number): GameState {
    const s = withDoctrine(gameInTrain(), d);
    s.date = { year: 1849, month: 6, day: 18 }; // Monday — no Sabbath
    s.oxen.forEach((o) => (o.fatigue = fatigue));
    s.wagonTrain!.companions.forEach((w) => w.oxen.forEach((o) => (o.fatigue = fatigue)));
    return s;
  }

  it('prudent: avg ox-fat 55 (>50) → maintenance_layby', () => {
    expect(companyRestDecision(tiredTrain('prudent', 55)).mode).toBe('maintenance_layby');
  });
  it('hard_driver: avg ox-fat 55 (<=65) → travel (pushes harder)', () => {
    expect(companyRestDecision(tiredTrain('hard_driver', 55)).mode).toBe('travel');
  });
  it('hard_driver: avg ox-fat 70 (>65) → maintenance_layby', () => {
    expect(companyRestDecision(tiredTrain('hard_driver', 70)).mode).toBe('maintenance_layby');
  });
  it('hysteresis: in a maintenance block, ox-fat 40 (>50-15) HOLDS the layby', () => {
    const s = tiredTrain('prudent', 40);
    s.wagonTrain!.companyDecisionBlock = { mode: 'maintenance_layby', blockStartDay: s.day - 1 };
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });
  it('hysteresis cleared: in a maintenance block, ox-fat 30 (<50-15) → travel', () => {
    const s = tiredTrain('prudent', 30);
    s.wagonTrain!.companyDecisionBlock = { mode: 'maintenance_layby', blockStartDay: s.day - 1 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
  it('min HP trigger fires maintenance (prudent, HP 35 < 40, >= crisis 20)', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 18 };
    s.party[0].health = 35;
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });
});

describe('#1046 C1 — full precedence: crisis > sabbath > maintenance > travel', () => {
  it('devout, Sunday, ox-fat 90, min HP 15 → crisis (beats all)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    s.oxen.forEach((o) => (o.fatigue = 90));
    s.party[0].health = 15;
    expect(companyRestDecision(s).mode).toBe('crisis_layby');
  });
  it('devout, Sunday, ox-fat 90, healthy → sabbath (beats maintenance)', () => {
    const s = withDoctrine(gameInTrain(), 'devout');
    s.date = { year: 1849, month: 6, day: 17 };
    s.oxen.forEach((o) => (o.fatigue = 90));
    expect(companyRestDecision(s).mode).toBe('sabbath_layby');
  });
  it('prudent, Monday, ox-fat 90, healthy → maintenance (beats travel)', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 18 };
    s.oxen.forEach((o) => (o.fatigue = 90));
    s.wagonTrain!.companions.forEach((w) => w.oxen.forEach((o) => (o.fatigue = 90)));
    expect(companyRestDecision(s).mode).toBe('maintenance_layby');
  });
  it('prudent, Monday, fresh team, healthy → travel', () => {
    const s = withDoctrine(gameInTrain(), 'prudent');
    s.date = { year: 1849, month: 6, day: 18 };
    expect(companyRestDecision(s).mode).toBe('travel');
  });
});
