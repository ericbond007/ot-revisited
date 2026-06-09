// #1264 T5 — thirst-aware pace easing. The aggressive persona eases
// its pace from 'fast' → 'moderate' when the team is parched (avg
// hydration < HYDRATION_AMBER) AND a dry stretch still lies ahead.
// The contrast confirms the easing fires at the right time and doesn't
// fire when the team is watered (hydration 100).
//
// pace_pusher: unaffected — grinds regardless.

import { describe, it, expect } from 'vitest';
import {
  aggressivePersona,
  pacePusherPersona,
  cautiousPersona
} from '../src/lib/game/ai';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

const RNG = makeRng('thirst-1264');

/** A desert location between Salmon Falls (1380) and Fort Boise (1570).
 *  terrain=desert means projectedDryDaysToNextWater reads desert = true,
 *  and ft_boise (trading_post, 1570) is the next supply stop, so
 *  effectiveGapMiles returns > 0. Year 1849 = fort not yet abandoned. */
const DESERT_LOCATION = {
  trailPosition: 1385,
  milesTraveled: 1385,
  terrain: 'desert' as const,
  nextLandmarkId: 'ft_boise',
  previousLandmarkId: 'salmon_falls',
  atLandmarkId: undefined
};

/** A healthy party with fresh oxen at hydration 100 — in desert but
 *  watered (just left a waterSource; hydration 100 ≥ HYDRATION_AMBER 50
 *  so thirstWantsEasedPace returns false). */
function wateredDesertState(): GameState {
  const s = createInitialState({
    seed: 'thirst-watered',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    ...s,
    location: DESERT_LOCATION,
    // Healthy party (minPartyHealth >= 30) + fresh oxen — aggressive.pickPace base = 'fast'.
    party: s.party.map((m) => ({ ...m, health: 90 })),
    // Fresh oxen (avgFatigue = 0, hydration = 100).
    oxen: s.oxen.map((o) => ({ ...o, fatigue: 0, health: 100, hydration: 100 }))
  };
}

/** Same state but oxen parched (hydration = 25 < HYDRATION_AMBER 50) — 
 *  thirstWantsEasedPace should return true. */
function parchedDesertState(): GameState {
  const base = wateredDesertState();
  return {
    ...base,
    oxen: base.oxen.map((o) => ({ ...o, hydration: 25 }))
  };
}

describe('#1264 — aggressive thirst-aware pace easing', () => {
  it('watered healthy team returns fast (base pace, easing NOT triggered)', () => {
    const state = wateredDesertState();
    expect(aggressivePersona.pickPace(state, RNG)).toBe('fast');
  });

  it('parched team (hydration 25) returns moderate (eased one rung)', () => {
    const state = parchedDesertState();
    expect(aggressivePersona.pickPace(state, RNG)).toBe('moderate');
  });

  it('pace_pusher ignores thirst — still returns fast on parched state', () => {
    const state = parchedDesertState();
    // pace_pusher: minPartyHealth >= 70, oxen fresh → returns 'fast' regardless.
    expect(pacePusherPersona.pickPace(state, RNG)).toBe('fast');
  });
});

describe('#1264 — cautious thirst-aware pace easing (sanity)', () => {
  it('parched cautious never returns grueling (moderate base → moderate still, no regression)', () => {
    // Cautious only reaches 'slow' or 'moderate'. Parched state: base is
    // 'moderate', eased 'moderate' = 'moderate'. Not grueling — sanity check.
    const state = parchedDesertState();
    const pace = cautiousPersona.pickPace(state, RNG);
    expect(pace).not.toBe('grueling');
    expect(pace).not.toBe('fast');
  });
});
