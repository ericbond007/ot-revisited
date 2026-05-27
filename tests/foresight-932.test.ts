// #932 Gap-aware bot planning — foresight helpers tested against the
// real LANDMARKS catalog so we catch any future trail edit that changes
// post-to-post distances.

import { describe, it, expect } from 'vitest';
import { nextSupplyDistance, gapBufferDays } from '../src/lib/game/ai/foresight';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  // #1163 — bumped from 1849 to 1858 so all road-ranch posts
  // (hollenberg_ranch, rock_creek_station; both gated >=1857) are open
  // for these "pure cumulative-mile" tests. The year-gating behavior
  // is covered by tests/foresight-abandoned-1163.test.ts.
  return createInitialState({
    seed: 'r932',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1858, month: 4, day: 15 }
  });
}

function atMile(s: GameState, miles: number): GameState {
  return { ...s, location: { ...s.location, milesTraveled: miles } };
}

describe('#932 nextSupplyDistance', () => {
  // #1040 — historical mileage pass re-anchored supply-post cumulative
  // miles. Year 1858 open-supply sequence (post-#1163 year filter):
  // Hollenberg 180, Rock Creek 207, Kearny 319, Ft Laramie 650
  // (Robidoux gated >1852 — gone), Ft Caspar 773, The Dalles 1950,
  // Oregon City (end) 2170. The Hall/Boise/Walla Walla cluster all
  // closed by 1858 (each gated after-1855 or after-1856).
  it('at the start, reports distance to first supply post (Hollenberg Ranch, mi 180)', () => {
    const s = atMile(game(), 0);
    expect(nextSupplyDistance(s)).toBe(180);
  });

  it('right after Hollenberg (mi 180), reports distance to Rock Creek (mi 207, gap 27)', () => {
    const s = atMile(game(), 180);
    expect(nextSupplyDistance(s)).toBe(27);
  });

  it('at Fort Kearny (mi 319), reports gap to Ft Laramie (#1163: Robidoux >1852 gone in 1858, mi 650, gap 331)', () => {
    const s = atMile(game(), 319);
    expect(nextSupplyDistance(s)).toBe(331);
  });

  it('mid-gap (mi 500, between Kearny and Laramie), reports remaining 150 mi to Laramie', () => {
    const s = atMile(game(), 500);
    expect(nextSupplyDistance(s)).toBe(150);
  });

  it('at The Dalles (mi 1950), reports 220 mi to Oregon City end', () => {
    const s = atMile(game(), 1950);
    expect(nextSupplyDistance(s)).toBe(220);
  });

  it('returns 0 when the wagon has cleared the trail end', () => {
    const s = atMile(game(), 2170);
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
