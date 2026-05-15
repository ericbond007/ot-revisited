// #303c slice B — Identity-decision persona surfaces. Six methods
// lifted from hardcoded inline logic to the Persona interface so
// future #287 named profiles (Sager / Reed / Joe Meek / preacher
// archetype etc.) can override per character. Default behavior
// preserves current bot logic; this slice is a pure surface lift.

import { describe, it, expect } from 'vitest';
import { cautiousPersona, balancedPersona, aggressivePersona, chaosPersona } from '../src/lib/game/ai';
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

// #939l — shouldBuyCookwareSpare + shouldBuySaleratus describe blocks
// removed. The dispositions live on `pickEquipmentRestockOpts.cookwareSpare`
// (#909) and `pickFoodRestockOpts.saleratusOverstock` — covered by
// `tests/npc-shouldbuy-909.test.ts`.

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

// #936b — `mudAbandonmentPriority` re-added to the Persona interface
// WITH a consumer: NPC/bot stuck-in-mud resolution calls
// `abandonHeavyLoad(state, persona.mudAbandonmentPriority?.())`.
// Per-persona drop-order character is covered in mud-abandon-936b.test.ts.
