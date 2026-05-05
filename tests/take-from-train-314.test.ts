// #314 — take_from_train camp action. Verifies registry, gates,
// 50/35/15 outcome distribution, companion morale crash on caught,
// the _caughtStealingDay flag, and persona refusal across the
// non-chaos personas.

import { describe, it, expect } from 'vitest';
import {
  CAMP_ACTIONS,
  CAMP_ACTIONS_BY_ID,
  getCampAction
} from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'steal',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

function inTrain(over: Partial<GameState> = {}): GameState {
  const s = game();
  const train = generateTrain('steal-train', 1, null, makeRng('steal-train-seed'));
  return { ...s, wagonTrain: train, ...over };
}

describe('#314 — take_from_train registration', () => {
  it('appears in CAMP_ACTIONS_BY_ID', () => {
    expect(CAMP_ACTIONS_BY_ID.take_from_train).toBeDefined();
  });

  it('appears in iterable CAMP_ACTIONS list', () => {
    expect(CAMP_ACTIONS.some((a) => a.id === 'take_from_train')).toBe(true);
  });

  it('getCampAction resolves it', () => {
    const a = getCampAction('take_from_train');
    expect(a.id).toBe('take_from_train');
    expect(a.hourCost).toBe(3);
  });
});

describe('#314 — take_from_train availability gates', () => {
  it('available when in a train with live companions', () => {
    const a = getCampAction('take_from_train');
    expect(a.availability(inTrain()).available).toBe(true);
  });

  it('hidden + unavailable solo', () => {
    const a = getCampAction('take_from_train');
    const result = a.availability(game());
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/wagon train/i);
    expect(a.hidden?.(game())).toBe(true);
  });

  it('hidden when every companion is wiped/abandoned', () => {
    const a = getCampAction('take_from_train');
    const base = inTrain();
    if (!base.wagonTrain) throw new Error('train should exist');
    const dead = {
      ...base,
      wagonTrain: {
        ...base.wagonTrain,
        companions: base.wagonTrain.companions.map((c) => ({ ...c, outcome: 'wiped' as const }))
      }
    };
    expect(a.availability(dead).available).toBe(false);
    expect(a.hidden?.(dead)).toBe(true);
  });
});

describe('#314 — take_from_train outcome distribution', () => {
  it('roughly 50% caught, 35% small grab, 15% bigger grab over many trials', () => {
    const a = getCampAction('take_from_train');
    let caught = 0;
    let smallGrab = 0;
    let biggerGrab = 0;
    for (let i = 0; i < 400; i++) {
      const s = inTrain();
      const next = a.apply(s, makeRng(`d${i}`));
      if (next.flags._caughtStealingDay !== undefined) {
        caught++;
      } else {
        // Bigger grab is when cash > $5 OR a luxury item appeared.
        const cashDelta = next.cash - s.cash;
        const luxItems = ['silver_tea_service', 'china_tea_set', 'fiddle', 'cookware'];
        const gotLux = luxItems.some((id) => (next.inventory[id] ?? 0) > (s.inventory[id] ?? 0));
        if (cashDelta >= 20 || gotLux) biggerGrab++;
        else smallGrab++;
      }
    }
    // Expect ~200 / 140 / 60. Wide tolerance.
    expect(caught).toBeGreaterThan(150);
    expect(caught).toBeLessThan(250);
    expect(smallGrab).toBeGreaterThan(95);
    expect(smallGrab).toBeLessThan(190);
    expect(biggerGrab).toBeGreaterThan(30);
    expect(biggerGrab).toBeLessThan(110);
  });

  it('caught path drops every live companion morale by 20', () => {
    const a = getCampAction('take_from_train');
    for (let i = 0; i < 20; i++) {
      const s = inTrain();
      const before = s.wagonTrain!.companions.map((c) => c.morale);
      const next = a.apply(s, makeRng(`c${i}`));
      if (next.flags._caughtStealingDay !== undefined) {
        const after = next.wagonTrain!.companions.map((c) => c.morale);
        for (let j = 0; j < before.length; j++) {
          if (s.wagonTrain!.companions[j].outcome === 'in-progress') {
            expect(after[j]).toBe(Math.max(0, before[j] - 20));
          }
        }
        return;
      }
    }
    throw new Error('Caught path never fired in 20 trials');
  });

  it('caught path drops player morale by 15', () => {
    const a = getCampAction('take_from_train');
    for (let i = 0; i < 20; i++) {
      const s = inTrain();
      const next = a.apply(s, makeRng(`m${i}`));
      if (next.flags._caughtStealingDay !== undefined) {
        expect(next.morale).toBe(Math.max(0, s.morale - 15));
        expect(next.flags._caughtStealingDay).toBe(s.day);
        return;
      }
    }
    throw new Error('Caught path never fired in 20 trials');
  });

  it('success path drops player morale by 3 (quiet guilt)', () => {
    const a = getCampAction('take_from_train');
    for (let i = 0; i < 50; i++) {
      const s = inTrain();
      const next = a.apply(s, makeRng(`g${i}`));
      if (next.flags._caughtStealingDay === undefined) {
        expect(next.morale).toBe(Math.max(0, s.morale - 3));
        return;
      }
    }
    throw new Error('Success path never fired in 50 trials');
  });
});

describe('#314 — Persona.shouldStealFromTrain', () => {
  it('cautious / balanced / aggressive all refuse even in a train', async () => {
    const { cautiousPersona, balancedPersona, aggressivePersona } = await import('../src/lib/game/ai');
    const s = inTrain();
    expect(cautiousPersona.shouldStealFromTrain(s, makeRng('p'))).toBe(false);
    expect(balancedPersona.shouldStealFromTrain(s, makeRng('p'))).toBe(false);
    expect(aggressivePersona.shouldStealFromTrain(s, makeRng('p'))).toBe(false);
  });

  it('chaos refuses outside a train', async () => {
    const { chaosPersona } = await import('../src/lib/game/ai');
    let yes = 0;
    for (let i = 0; i < 200; i++) {
      if (chaosPersona.shouldStealFromTrain(game(), makeRng(`c${i}`))) yes++;
    }
    expect(yes).toBe(0);
  });

  it('chaos rolls roughly 3% in a train over many trials', async () => {
    const { chaosPersona } = await import('../src/lib/game/ai');
    const s = inTrain();
    let yes = 0;
    for (let i = 0; i < 1000; i++) {
      if (chaosPersona.shouldStealFromTrain(s, makeRng(`c${i}`))) yes++;
    }
    // ~30 expected; tolerate 5-80.
    expect(yes).toBeGreaterThan(5);
    expect(yes).toBeLessThan(80);
  });
});
