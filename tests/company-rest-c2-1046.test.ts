import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { NpcWagonState, GameState } from '../src/lib/game/types';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';

function freshWagon(): NpcWagonState {
  const t = generateTrain('c2', 1, 'independence_mo', makeRng('c2'), { fresh: true });
  return { ...t.companions[0], personaId: 'balanced' };
}

// traveled: false because a lay-by day does not travel; this matches what
// advanceTrain will pass (companyMode !== 'travel' → traveled = false).
const CTX_LAYBY = {
  day: 1, traveled: false, pace: 'moderate' as const,
  terrain: 'prairie' as const, weather: 'clear' as const, traveledMiles: 14,
  companyRestMode: 'maintenance_layby' as const
};

const CTX_TRAVEL = { ...CTX_LAYBY, traveled: true, companyRestMode: 'travel' as const };
const CTX_SOLO = {
  day: 1, traveled: true, pace: 'moderate' as const,
  terrain: 'prairie' as const, weather: 'clear' as const, traveledMiles: 14
  // no companyRestMode → solo path
};

describe('#1046 C2 — NpcTickContext.companyRestMode', () => {
  it('a worn in-train wagon under a company lay-by recovers ox fatigue', () => {
    const base = freshWagon();
    const worn: NpcWagonState = { ...base, oxen: base.oxen.map((o) => ({ ...o, fatigue: 60 })) };
    const startFat = worn.oxen.reduce((s, o) => s + o.fatigue, 0);
    const { wagon } = tickNpcWagon(worn, CTX_LAYBY, makeRng('t'));
    const endFat = wagon.oxen.reduce((s, o) => s + o.fatigue, 0);
    expect(endFat).toBeLessThan(startFat);
  });
});

describe('#1046 C2 — in-train follows company; solo keeps persona rest', () => {
  it('company says travel → a worn in-train wagon still travels (persona shouldRest bypassed)', () => {
    const base = freshWagon();
    const worn: NpcWagonState = {
      ...base, personaId: 'cautious',
      // fatigue 80 > worn-out 70: cautious WOULD self-rest if not bypassed → discriminating
      oxen: base.oxen.map((o) => ({ ...o, fatigue: 80 }))
    };
    const startFat = worn.oxen.reduce((s, o) => s + o.fatigue, 0);
    const { wagon } = tickNpcWagon(worn, CTX_TRAVEL, makeRng('t'));
    const endFat = wagon.oxen.reduce((s, o) => s + o.fatigue, 0);
    expect(endFat).toBeGreaterThan(startFat); // traveled → fatigue accrued (didn't self-rest)
  });

  it('solo wagon (no companyRestMode) still self-rests via persona shouldRest when worn', () => {
    const base = freshWagon();
    const worn: NpcWagonState = {
      ...base, personaId: 'cautious',
      oxen: base.oxen.map((o) => ({ ...o, fatigue: 80 }))
    };
    const startFat = worn.oxen.reduce((s, o) => s + o.fatigue, 0);
    const { wagon } = tickNpcWagon(worn, CTX_SOLO, makeRng('t'));
    const endFat = wagon.oxen.reduce((s, o) => s + o.fatigue, 0);
    expect(endFat).toBeLessThan(startFat); // persona shouldRest fired → rested
  });
});

function gameInTrain(doctrine: 'prudent' | 'hard_driver' | 'devout'): GameState {
  const s = createInitialState({
    seed: 'c2g', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 18 } // Monday — no Sabbath
  });
  const train = generateTrain('c2g', 1, null, makeRng('c2g'), { fresh: true });
  return { ...s, wagonTrain: { ...train, doctrine } };
}

describe('#1046 C2 — tickDayPausable wires the company decision', () => {
  it('healthy prudent train → travels: miles advance + block mode travel', () => {
    const s = gameInTrain('prudent');
    const milesBefore = s.location.milesTraveled;
    const { state } = tickDayPausable(s);
    expect(state.location.milesTraveled).toBeGreaterThan(milesBefore);
    expect(state.wagonTrain!.companyDecisionBlock?.mode).toBe('travel');
  });

  it('crisis (min HP < 20) → lay-by: NO miles + block crisis_layby + day still advances', () => {
    const s = gameInTrain('prudent');
    s.party[0].health = 15;
    const milesBefore = s.location.milesTraveled;
    const dayBefore = s.day;
    const { state } = tickDayPausable(s);
    expect(state.location.milesTraveled).toBe(milesBefore);
    expect(state.wagonTrain!.companyDecisionBlock?.mode).toBe('crisis_layby');
    expect(state.day).toBe(dayBefore + 1);
  });

  it('solo (no train) unaffected — miles advance, no block', () => {
    const s = createInitialState({
      seed: 'solo', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 6, day: 18 }
    });
    const milesBefore = s.location.milesTraveled;
    const { state } = tickDayPausable(s);
    expect(state.location.milesTraveled).toBeGreaterThan(milesBefore);
    expect(state.wagonTrain ?? null).toBeNull();
  });
});

it('a freshly generated train starts with no decision block; first tick sets it', () => {
  const t = generateTrain('jt', 1, null, makeRng('jt'), { fresh: true });
  expect(t.companyDecisionBlock).toBeUndefined();
});

it('a held lay-by block keeps its original blockStartDay + logs only once across ticks', () => {
  const s = gameInTrain('prudent');
  // #1046 A+D — scenario hardened so the lay-by rest-heal doesn't exit
  // the crisis band on tick 2; original hysteresis-hold intent
  // preserved under A+D recovery. Pre-A+D a lay-by day had no heal so
  // health=15 trivially stayed in crisis; post-A+D layByRecovery (+8×
  // morale-mult ≈ +9/tick) would lift 15→24 and reclassify
  // crisis_layby→maintenance_layby (a real mode change ⇒ new block —
  // correct A+D "the lay-by pays off"). Starting deeper in crisis
  // (health 8) means even after the tick-1 heal (8→17) and tick-2 heal
  // (17→26 while the held block + hysteresis pin the mode) the company
  // genuinely STAYS in crisis_layby across both ticks, so the
  // hysteresis-hold invariant (blockStartDay stable within a held mode,
  // only re-stamped on a real mode change) is actually exercised.
  s.party[0].health = 8; // deep crisis → crisis_layby; one rest-heal can't exit → block HOLDS
  const t1 = tickDayPausable(s).state;
  const block1 = t1.wagonTrain!.companyDecisionBlock!;
  expect(block1.mode).toBe('crisis_layby');
  const laysByLogs1 = t1.eventLog.filter((e) => e.text.includes('lays by')).length;

  const t2 = tickDayPausable(t1).state;
  const block2 = t2.wagonTrain!.companyDecisionBlock!;
  expect(block2.mode).toBe('crisis_layby');
  expect(block2.blockStartDay).toBe(block1.blockStartDay); // held, not re-stamped
  const laysByLogs2 = t2.eventLog.filter((e) => e.text.includes('lays by')).length;
  expect(laysByLogs2).toBe(laysByLogs1); // no second "lays by" line while the block holds
});
