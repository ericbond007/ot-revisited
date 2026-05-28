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
