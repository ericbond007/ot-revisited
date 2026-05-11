// #932 Gap-aware bot planning — foresight helpers tested against the
// real LANDMARKS catalog so we catch any future trail edit that changes
// post-to-post distances.

import { describe, it, expect } from 'vitest';
import { nextSupplyDistance, gapBufferDays } from '../src/lib/game/ai/foresight';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'r932',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function atMile(s: GameState, miles: number): GameState {
  return { ...s, location: { ...s.location, milesTraveled: miles } };
}

describe('#932 nextSupplyDistance', () => {
  it('at the start, reports distance to first supply post (Hollenberg Ranch, mi 215)', () => {
    const s = atMile(game(), 0);
    expect(nextSupplyDistance(s)).toBe(215);
  });

  it('right after Hollenberg (mi 215), reports distance to Rock Creek (mi 230, gap 15)', () => {
    const s = atMile(game(), 215);
    expect(nextSupplyDistance(s)).toBe(15);
  });

  it('after Fort Kearny (mi 335), reports the big 317-mile gap to Robidoux (mi 652)', () => {
    const s = atMile(game(), 335);
    expect(nextSupplyDistance(s)).toBe(317);
  });

  it('mid-gap (mi 500, between Kearny and Robidoux), reports remaining 152 mi', () => {
    const s = atMile(game(), 500);
    expect(nextSupplyDistance(s)).toBe(152);
  });

  it('after the final post (past The Dalles at mi 2065), reports 130 mi to Oregon City end', () => {
    const s = atMile(game(), 2065);
    expect(nextSupplyDistance(s)).toBe(130);
  });

  it('returns 0 when the wagon has cleared the trail end', () => {
    const s = atMile(game(), 2195);
    expect(nextSupplyDistance(s)).toBe(0);
  });

  it('returns 0 past the trail end (overshoot)', () => {
    const s = atMile(game(), 3000);
    expect(nextSupplyDistance(s)).toBe(0);
  });
});

describe('#932 gapBufferDays', () => {
  it('floors at minDays when gap is short (15 mi at 10 mi/day, 1.2× = 1.8 days → minDays 20)', () => {
    expect(gapBufferDays(15, { paceMiPerDay: 10, safetyFactor: 1.2, minDays: 20 })).toBe(20);
  });

  it('scales by safety factor for big gaps (317 mi at 10 mi/day, 1.2× = 38 days)', () => {
    expect(gapBufferDays(317, { paceMiPerDay: 10, safetyFactor: 1.2, minDays: 10 })).toBe(38);
  });

  it('cautious 1.5× safety inflates 300 mi at 10 mi/day to 45 days', () => {
    expect(gapBufferDays(300, { paceMiPerDay: 10, safetyFactor: 1.5, minDays: 10 })).toBe(45);
  });

  it('aggressive 1.0× safety trims 300 mi at 14 mi/day to 21 days', () => {
    expect(gapBufferDays(300, { paceMiPerDay: 14, safetyFactor: 1.0, minDays: 10 })).toBe(21);
  });

  it('returns minDays when miles <= 0 (past last post)', () => {
    expect(gapBufferDays(0, { paceMiPerDay: 10, safetyFactor: 1.2, minDays: 15 })).toBe(15);
    expect(gapBufferDays(-5, { paceMiPerDay: 10, safetyFactor: 1.2, minDays: 15 })).toBe(15);
  });

  it('guards against zero pace (no divide-by-zero)', () => {
    // Underflow: treat pace=0 as pace=1 internally
    expect(gapBufferDays(100, { paceMiPerDay: 0, safetyFactor: 1.0, minDays: 5 })).toBe(100);
  });
});
