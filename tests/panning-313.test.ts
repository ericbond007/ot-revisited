// #313 — panning for gold camp action. Verifies year + terrain + miles
// gates, the period-realistic yield distribution, and the registry
// hooks (CAMP_ACTIONS_BY_ID + iterable list).

import { describe, it, expect } from 'vitest';
import {
  CAMP_ACTIONS,
  CAMP_ACTIONS_BY_ID,
  getCampAction
} from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'pan',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

function panReady(over: Partial<GameState> = {}): GameState {
  // 1849+ at a river west of mile 700 — the gate sweet spot
  return {
    ...game(),
    location: {
      ...game().location,
      terrain: 'river',
      milesTraveled: 850
    },
    ...over
  };
}

describe('#313 — pan_for_gold registration', () => {
  it('appears in CAMP_ACTIONS_BY_ID', () => {
    expect(CAMP_ACTIONS_BY_ID.pan_for_gold).toBeDefined();
  });

  it('appears in iterable CAMP_ACTIONS list', () => {
    expect(CAMP_ACTIONS.some((a) => a.id === 'pan_for_gold')).toBe(true);
  });

  it('getCampAction resolves it', () => {
    const a = getCampAction('pan_for_gold');
    expect(a.id).toBe('pan_for_gold');
    expect(a.hourCost).toBe(3);
  });
});

describe('#313 — pan_for_gold availability gates', () => {
  it('available at river + miles ≥ 700 + year ≥ 1849', () => {
    const a = getCampAction('pan_for_gold');
    const result = a.availability(panReady());
    expect(result.available).toBe(true);
  });

  it('gates out pre-1849 (no Gold Rush awareness)', () => {
    const a = getCampAction('pan_for_gold');
    const s = panReady({ date: { year: 1846, month: 6, day: 15 } });
    const result = a.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/Gold rush/i);
  });

  it('gates out non-river terrain', () => {
    const a = getCampAction('pan_for_gold');
    const s = panReady({
      location: { ...panReady().location, terrain: 'prairie' }
    });
    const result = a.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/creek|river/i);
  });

  it('gates out eastern miles (no gold east of Independence Rock)', () => {
    const a = getCampAction('pan_for_gold');
    const s = panReady({
      location: { ...panReady().location, milesTraveled: 100 }
    });
    const result = a.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/gold country|western/i);
  });
});

describe('#313 — pan_for_gold yield distribution (period-faithful)', () => {
  it('most days yield nothing (Wood 1850: "got nothing")', () => {
    const a = getCampAction('pan_for_gold');
    let nothings = 0;
    for (let i = 0; i < 100; i++) {
      const s = panReady();
      const next = a.apply(s, makeRng(`n${i}`));
      if (next.cash === s.cash) nothings++;
    }
    // ~95% should yield nothing
    expect(nothings).toBeGreaterThan(85);
    expect(nothings).toBeLessThan(99);
  });

  it('finds dust ($1-3) on small-luck days', () => {
    const a = getCampAction('pan_for_gold');
    let foundDust = false;
    for (let i = 0; i < 500; i++) {
      const s = panReady();
      const next = a.apply(s, makeRng(`d${i}`));
      if (next.cash > s.cash && next.cash - s.cash <= 3) {
        expect(next.eventLog.at(-1)?.text).toMatch(/dust|specks/i);
        foundDust = true;
        break;
      }
    }
    expect(foundDust).toBe(true);
  });

  it('finds small flake ($5-15) on bigger-luck days', () => {
    const a = getCampAction('pan_for_gold');
    let foundFlake = false;
    for (let i = 0; i < 1000; i++) {
      const s = panReady();
      const next = a.apply(s, makeRng(`f${i}`));
      if (next.cash > s.cash && next.cash - s.cash >= 5) {
        expect(next.eventLog.at(-1)?.text).toMatch(/flake/i);
        foundFlake = true;
        break;
      }
    }
    expect(foundFlake).toBe(true);
  });

  it('persona shouldPan — cautious skips, balanced/aggressive take when eligible', async () => {
    const { cautiousPersona, balancedPersona, aggressivePersona } = await import('../src/lib/game/ai');
    const { makeRng } = await import('../src/lib/game/rng');
    const s = panReady();
    expect(cautiousPersona.shouldPan(s, makeRng('p'))).toBe(false);
    expect(balancedPersona.shouldPan(s, makeRng('p'))).toBe(true);
    expect(aggressivePersona.shouldPan(s, makeRng('p'))).toBe(true);
  });

  it('persona shouldPan respects cooldown (last pan within 7 days = false)', async () => {
    const { balancedPersona } = await import('../src/lib/game/ai');
    const { makeRng } = await import('../src/lib/game/rng');
    const s: GameState = {
      ...panReady(),
      day: 100,
      flags: { _lastPannedDay: 95 }
    };
    expect(balancedPersona.shouldPan(s, makeRng('p'))).toBe(false);
  });

  it('logs flavor on no-yield days too', () => {
    const a = getCampAction('pan_for_gold');
    const s = panReady();
    // Find a known-empty seed
    let nothingNext = a.apply(s, makeRng('empty-seed-0'));
    let tries = 0;
    while (nothingNext.cash !== s.cash && tries < 20) {
      tries++;
      nothingNext = a.apply(s, makeRng(`empty-seed-${tries}`));
    }
    if (nothingNext.cash === s.cash) {
      expect(nothingNext.eventLog.at(-1)?.text).toMatch(/panning|gravel|nothing/i);
    }
  });
});
