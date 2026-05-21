// #931 — pickOxSwapCountFor refactor: optimalTeam baseline + freshBuffer offset.
//
// Pre-#931 the helper targeted `minTeam + thinThreshold` — misaligned
// with oxenSpeedFactor which uses optimalTeam. The bot didn't realize
// that a sub-optimal team is a permanent speed penalty; aggressive
// ran at minTeam (the can't-move floor) and never refreshed.
//
// Post-#931 the helper targets `optimalTeam + freshBuffer` (clamped at
// minTeam), aligned with the speed model. Personas pick a freshBuffer
// offset relative to optimal:
//   cautious  +1   (slight buffer above optimal)
//   balanced   0   (exactly optimal)
//   aggressive −1  (one below optimal, still above minTeam on schooner)
//   generous  +1   (mirrors cautious)
//   hoarder   never (always returns 0, helper not called)
//   chaos     random 0-3 (helper not called)

import { describe, it, expect } from 'vitest';
import { cautiousPersona, balancedPersona, aggressivePersona, generousPersona, hoarderPersona } from '../src/lib/game/ai/personas';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

const post = getLandmark('ft_laramie'); // has ox_swap; far from next post

function schooner(oxenCount: number, health = 100): GameState {
  const s = createInitialState({
    seed: 'oxsw931',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  // Default starter wagon is prairie_schooner (optimalTeam=4, minTeam=2).
  // Default starter team has 4 oxen — adjust to `oxenCount` healthy.
  const trimmed = s.oxen.slice(0, Math.min(oxenCount, s.oxen.length))
    .map((o) => ({ ...o, health }));
  return {
    ...s,
    cash: 500,
    oxen: trimmed,
    location: { ...s.location, atLandmarkId: 'ft_laramie', milesTraveled: 600 }
  };
}

describe('#931 — pickOxSwapCount targets optimalTeam + freshBuffer', () => {
  it('balanced on a 4-ox schooner (= optimal) → 0 (target met)', () => {
    expect(balancedPersona.pickOxSwapCount(schooner(4), post, makeRng('p'))).toBe(0);
  });
  it('balanced on a 3-ox schooner → swaps to reach optimal (target=4)', () => {
    expect(balancedPersona.pickOxSwapCount(schooner(3), post, makeRng('p'))).toBeGreaterThan(0);
  });
  it('cautious on a 4-ox schooner → swaps for above-optimal buffer (target=5)', () => {
    // #931 — cautious deliberately wants a fresh buffer ABOVE optimal,
    // so a full-optimal team still triggers a buffer swap. This is the
    // intent change vs pre-#931 (where the cautious "skips on optimal"
    // assertion held because cautious targeted optimal exactly).
    expect(cautiousPersona.pickOxSwapCount(schooner(4), post, makeRng('p'))).toBeGreaterThan(0);
  });
  it('cautious on a 5-ox schooner → 0 (buffer met at optimal+1)', () => {
    expect(cautiousPersona.pickOxSwapCount(schooner(5), post, makeRng('p'))).toBe(0);
  });
  it('aggressive on a 4-ox schooner → 0 (already at-or-above optimal-1=3)', () => {
    expect(aggressivePersona.pickOxSwapCount(schooner(4), post, makeRng('p'))).toBe(0);
  });
  it('aggressive on a 3-ox schooner → 0 (exactly at target=3)', () => {
    // #931 — aggressive now targets optimal−1 (not minTeam), so a 3-ox
    // schooner is "lean but ok"; only swaps below 3.
    expect(aggressivePersona.pickOxSwapCount(schooner(3), post, makeRng('p'))).toBe(0);
  });
  it('aggressive on a 2-ox schooner → swaps (3-2=1) — was at minTeam pre-#931, no swap; now realizes sub-optimal is permanent penalty', () => {
    expect(aggressivePersona.pickOxSwapCount(schooner(2), post, makeRng('p'))).toBeGreaterThan(0);
  });
  it('generous mirrors cautious (freshBuffer +1)', () => {
    expect(generousPersona.pickOxSwapCount(schooner(4), post, makeRng('p'))).toBeGreaterThan(0);
    expect(generousPersona.pickOxSwapCount(schooner(5), post, makeRng('p'))).toBe(0);
  });
  it('hoarder never swaps regardless of team state', () => {
    expect(hoarderPersona.pickOxSwapCount(schooner(2), post, makeRng('p'))).toBe(0);
    expect(hoarderPersona.pickOxSwapCount(schooner(4), post, makeRng('p'))).toBe(0);
  });
});
