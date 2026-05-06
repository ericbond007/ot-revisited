// #303c slice B — Identity-decision persona surfaces. Six methods
// lifted from hardcoded inline logic to the Persona interface so
// future #287 named profiles (Sager / Reed / Joe Meek / preacher
// archetype etc.) can override per character. Default behavior
// preserves current bot logic; this slice is a pure surface lift.

import { describe, it, expect } from 'vitest';
import { cautiousPersona, balancedPersona, aggressivePersona, chaosPersona } from '../src/lib/game/ai';
import { ABANDON_PRIORITY } from '../src/lib/game/systems/item-loss';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'p',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, ...over };
}

const DETERMINISTIC = [cautiousPersona, balancedPersona, aggressivePersona] as const;

describe('#303c slice B — shouldJoinTrain', () => {
  const laramie = getLandmark('ft_laramie');

  it('all deterministic personas join by default', () => {
    const s = game();
    for (const p of DETERMINISTIC) {
      expect(p.shouldJoinTrain(s, laramie, makeRng('p'))).toBe(true);
    }
  });

  it('chaos rolls (~70%) — varies by seed', () => {
    const s = game();
    const counts = { yes: 0, no: 0 };
    for (let i = 0; i < 200; i++) {
      const r = chaosPersona.shouldJoinTrain(s, laramie, makeRng(`c${i}`));
      counts[r ? 'yes' : 'no']++;
    }
    expect(counts.yes).toBeGreaterThan(100); // ~140 expected
    expect(counts.no).toBeGreaterThan(20);   // ~60 expected
  });
});

describe('#303c slice B — shouldBuyCookwareSpare', () => {
  const laramie = getLandmark('ft_laramie');
  const kearny = getLandmark('ft_kearny');
  const chimney = getLandmark('chimney_rock'); // no stock

  it('all personas return false when post does not stock cookware', () => {
    const s = game();
    for (const p of DETERMINISTIC) {
      expect(p.shouldBuyCookwareSpare(s, chimney)).toBe(false);
    }
  });

  it('all personas return true when stock has cookware AND inv has none', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 0 } };
    for (const p of DETERMINISTIC) {
      expect(p.shouldBuyCookwareSpare(s, laramie)).toBe(true);
    }
  });

  it('all personas return false when bot already has 1+ cookware', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 1 } };
    for (const p of DETERMINISTIC) {
      expect(p.shouldBuyCookwareSpare(s, laramie)).toBe(false);
    }
  });
});

describe('#303c slice B — shouldBuySaleratus', () => {
  const laramie = getLandmark('ft_laramie');
  const chimney = getLandmark('chimney_rock');

  it('returns false when post does not stock saleratus', () => {
    const s = game();
    expect(cautiousPersona.shouldBuySaleratus(s, chimney)).toBe(false);
  });

  it('returns true when post stocks AND bot has < 2 units', () => {
    const s = { ...game(), inventory: { ...game().inventory, saleratus: 1 } };
    for (const p of DETERMINISTIC) {
      expect(p.shouldBuySaleratus(s, laramie)).toBe(true);
    }
  });

  it('returns false when bot has 2+ units already', () => {
    const s = { ...game(), inventory: { ...game().inventory, saleratus: 4 } };
    for (const p of DETERMINISTIC) {
      expect(p.shouldBuySaleratus(s, laramie)).toBe(false);
    }
  });
});

describe('#303c slice B — shouldCannibalize', () => {
  it('all personas return true (default — Donner Party precedent)', () => {
    const s = game();
    expect(cautiousPersona.shouldCannibalize(s)).toBe(true);
    expect(balancedPersona.shouldCannibalize(s)).toBe(true);
    expect(aggressivePersona.shouldCannibalize(s)).toBe(true);
    expect(chaosPersona.shouldCannibalize(s)).toBe(true);
  });
});

describe('#303c slice B — pickNpcEventChoice', () => {
  it('all personas return null (surface-only — no choice-bearing NPC events yet)', () => {
    const s = game();
    expect(cautiousPersona.pickNpcEventChoice(s, 'any', ['a', 'b'], makeRng('x'))).toBeNull();
    expect(balancedPersona.pickNpcEventChoice(s, 'any', ['a', 'b'], makeRng('x'))).toBeNull();
    expect(aggressivePersona.pickNpcEventChoice(s, 'any', ['a', 'b'], makeRng('x'))).toBeNull();
    expect(chaosPersona.pickNpcEventChoice(s, 'any', ['a', 'b'], makeRng('x'))).toBeNull();
  });
});

describe('#303c slice B — mudAbandonmentPriority', () => {
  it('all personas return the canonical ABANDON_PRIORITY by default', () => {
    expect(cautiousPersona.mudAbandonmentPriority()).toEqual(ABANDON_PRIORITY);
    expect(balancedPersona.mudAbandonmentPriority()).toEqual(ABANDON_PRIORITY);
    expect(aggressivePersona.mudAbandonmentPriority()).toEqual(ABANDON_PRIORITY);
    expect(chaosPersona.mudAbandonmentPriority()).toEqual(ABANDON_PRIORITY);
  });

  it('order is heaviest-luxury-first (Marcy "lining the trail with iron")', () => {
    const order = cautiousPersona.mudAbandonmentPriority();
    expect(order[0]).toBe('anvil');
    // Luxuries dropped before food bulk.
    expect(order.indexOf('china_tea_set')).toBeLessThan(order.indexOf('flour'));
  });
});
