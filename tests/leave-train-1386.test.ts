// #1386 — the period split: balanced/cautious press_on out of a
// discretionary lay-by at CRITICAL schedule pressure; sacred personas
// hold the Sabbath even then. Research basis:
// docs/superpowers/specs/2026-06-11-train-governance-research.md §3.
import { describe, it, expect } from 'vitest';
import { getPersona, makeBotRng } from '../src/lib/game/ai';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';
import type { CompanyRestDecision } from '../src/lib/game/types';

function baseState(): GameState {
  return createInitialState({
    seed: 'leave-1386',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor', sex: 'female', kind: 'adult' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}
/** Critical pressure: deep in the calendar, barely moved. */
function criticalState(): GameState {
  const s = baseState();
  return { ...s, day: 200, location: { ...s.location, milesTraveled: 900 } };
}
const SABBATH: CompanyRestDecision = { mode: 'sabbath_layby', reason: 't' };
const MAINT: CompanyRestDecision = { mode: 'maintenance_layby', reason: 't' };
const rng = makeBotRng('leave-1386');

describe('#1386 leave-train under critical pressure', () => {
  it('balanced abides a Sabbath lay-by at ok pressure', () => {
    expect(getPersona('balanced').shouldDissent(baseState(), SABBATH, rng)).toBe('abide');
  });
  it('balanced presses on out of a Sabbath lay-by at critical pressure', () => {
    expect(getPersona('balanced').shouldDissent(criticalState(), SABBATH, rng)).toBe('press_on');
  });
  it('balanced presses on out of a maintenance lay-by at critical pressure', () => {
    expect(getPersona('balanced').shouldDissent(criticalState(), MAINT, rng)).toBe('press_on');
  });
  it('cautious presses on at critical (children in the snow outranks company safety)', () => {
    expect(getPersona('cautious').shouldDissent(criticalState(), SABBATH, rng)).toBe('press_on');
  });
  it('faithful holds the Sabbath even at critical pressure', () => {
    expect(getPersona('faithful').shouldDissent(criticalState(), SABBATH, rng)).toBe('abide');
  });
  it('faithful still presses on out of a MAINTENANCE lay-by at critical', () => {
    expect(getPersona('faithful').shouldDissent(criticalState(), MAINT, rng)).toBe('press_on');
  });
  it('sunday_rester holds the Sabbath even at critical pressure', () => {
    expect(getPersona('sunday_rester').shouldDissent(criticalState(), SABBATH, rng)).toBe('abide');
  });
  it('crisis lay-bys are never a dissent surface (decision mode travel/crisis returns abide)', () => {
    expect(getPersona('balanced').shouldDissent(criticalState(), { mode: 'crisis_layby', reason: 't' }, rng)).toBe('abide');
    expect(getPersona('balanced').shouldDissent(criticalState(), { mode: 'travel', reason: 't' }, rng)).toBe('abide');
  });
});
