import { describe, expect, it } from 'vitest';
import { defaultWheelBreakResponse } from '../src/lib/game/ai/wheel-break';
import { createInitialState } from '../src/lib/game/engine';
import type { ProfessionId } from '../src/lib/game/types';

function state(opts: {
  wheel?: number;
  condition?: number;
  leaderProfession?: ProfessionId;
}) {
  const s = createInitialState({
    seed: 'persona-929',
    leader: { name: 'L', profession: opts.leaderProfession ?? 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'teacher', sex: 'female' }],
    startDate: { year: 1848, month: 4, day: 15 },
    includeStarterKit: true
  });
  if (opts.wheel !== undefined) s.inventory.wheel = opts.wheel;
  if (opts.condition !== undefined) s.wagon.condition = opts.condition;
  return s;
}

describe('defaultWheelBreakResponse', () => {
  it('spare when wheel inventory > 0', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 1, condition: 10 }))).toBe('spare');
    expect(defaultWheelBreakResponse(state({ wheel: 3, condition: 95, leaderProfession: 'blacksmith' }))).toBe('spare');
  });
  it('push_on when no spare + cond<25 + no smith', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 0, condition: 20 }))).toBe('push_on');
  });
  it('rebuild when no spare + cond>=25 + no smith', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 0, condition: 50 }))).toBe('rebuild');
  });
  it('rebuild when no spare + cond<25 + smith present', () => {
    expect(defaultWheelBreakResponse(state({ wheel: 0, condition: 20, leaderProfession: 'blacksmith' }))).toBe('rebuild');
  });
});

import { getPersona } from '../src/lib/game/ai/personas';
import { makeRng } from '../src/lib/game/rng';

describe('per-persona pickWheelBreakResponse', () => {
  const rng = makeRng('persona-929');

  it('cautious never pushes on (gate disabled)', () => {
    const p = getPersona('cautious');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 20 }), rng)).toBe('rebuild');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 5 }), rng)).toBe('rebuild');
  });

  it('balanced uses default policy', () => {
    const p = getPersona('balanced');
    expect(p.pickWheelBreakResponse(state({ wheel: 1 }), rng)).toBe('spare');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 20 }), rng)).toBe('push_on');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 50 }), rng)).toBe('rebuild');
  });

  it('aggressive pushes on at cond < 40', () => {
    const p = getPersona('aggressive');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 39 }), rng)).toBe('push_on');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 50 }), rng)).toBe('rebuild');
  });

  it('chaos pushes on at cond < 50', () => {
    const p = getPersona('chaos');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 49 }), rng)).toBe('push_on');
    expect(p.pickWheelBreakResponse(state({ wheel: 0, condition: 60 }), rng)).toBe('rebuild');
  });

  it('every persona returns spare when wheel inventory > 0', () => {
    for (const id of ['cautious', 'balanced', 'aggressive', 'chaos'] as const) {
      const p = getPersona(id);
      expect(p.pickWheelBreakResponse(state({ wheel: 1, condition: 10 }), rng)).toBe('spare');
    }
  });
});

import { runBot } from '../src/lib/dev/bot/runner';

describe('player-bot wires wagon_wheel pendingEvent through persona', () => {
  it('bot does not crash on a 60-day run with blacksmith leader', () => {
    const report = runBot({
      seed: 'wheel-bot-929',
      persona: 'balanced',
      leaderProfession: 'blacksmith',
      companionProfessions: ['teacher'],
      maxDays: 60
    });
    expect(report).toBeTruthy();
  });
});
