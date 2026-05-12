// #278 — trading-post oxen swap. Barter-first economy at Laramie /
// Bridger / Hall: 2 trail-worn surrendered + cash boot → 1 fresh ox,
// or cash-only at the higher per-head rate. 1849-50 Gold Rush years
// double cash. Persona surface drives the bot's swap count.

import { describe, it, expect } from 'vitest';
import {
  swapOxen,
  swapOxenCost,
  OX_SWAP_BARTER_BOOT_USD,
  OX_SWAP_CASH_ONLY_USD,
  OX_SWAP_GOLD_RUSH_MULT
} from '../src/lib/game/systems/town-services';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'ox-swap',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1848, month: 6, day: 15 }
  });
  return { ...s, cash: 500, ...over };
}

function atLaramie(over: Partial<GameState> = {}): GameState {
  const s = game(over);
  // Position miles at Laramie's actual cumulative mile (702). The
  // next supply post is Caspar at mi 810 — only a 108-mi gap, which
  // is BELOW #934's bigGapMiles=150 threshold for cautious/balanced,
  // so persona healthFloors test their base values (not gap-boosted).
  return {
    ...s,
    location: { ...s.location, atLandmarkId: 'ft_laramie', milesTraveled: 702 }
  };
}

describe('#278 — service flag on landmarks', () => {
  it('Laramie offers ox_swap', () => {
    expect(getLandmark('ft_laramie').services).toContain('ox_swap');
  });
  it('Bridger offers ox_swap', () => {
    expect(getLandmark('ft_bridger').services).toContain('ox_swap');
  });
  it('Hall offers ox_swap', () => {
    expect(getLandmark('ft_hall').services).toContain('ox_swap');
  });
  it('Boise does NOT offer ox_swap (HBC kept light on oxen)', () => {
    expect(getLandmark('ft_boise').services ?? []).not.toContain('ox_swap');
  });
  it('Kearny / Robidoux / Whitman do NOT offer ox_swap', () => {
    expect(getLandmark('ft_kearny').services ?? []).not.toContain('ox_swap');
    expect(getLandmark('robidoux_post').services ?? []).not.toContain('ox_swap');
    expect(getLandmark('whitman_mission').services ?? []).not.toContain('ox_swap');
  });
});

describe('#278 — swapOxenCost', () => {
  it('barter rate per fresh = OX_SWAP_BARTER_BOOT_USD in normal years', () => {
    const s = game({ date: { year: 1848, month: 6, day: 15 } });
    expect(swapOxenCost(s, 1).cost).toBe(OX_SWAP_BARTER_BOOT_USD);
    expect(swapOxenCost(s, 3).cost).toBe(OX_SWAP_BARTER_BOOT_USD * 3);
    expect(swapOxenCost(s, 1).goldRush).toBe(false);
  });
  it('cash-only rate per fresh = OX_SWAP_CASH_ONLY_USD in normal years', () => {
    const s = game({ date: { year: 1848, month: 6, day: 15 } });
    expect(swapOxenCost(s, 1, { cashOnly: true }).cost).toBe(OX_SWAP_CASH_ONLY_USD);
    expect(swapOxenCost(s, 4, { cashOnly: true }).cost).toBe(OX_SWAP_CASH_ONLY_USD * 4);
  });
  it('1849 doubles both rates', () => {
    const s = game({ date: { year: 1849, month: 6, day: 15 } });
    expect(swapOxenCost(s, 1).cost).toBe(OX_SWAP_BARTER_BOOT_USD * OX_SWAP_GOLD_RUSH_MULT);
    expect(swapOxenCost(s, 1, { cashOnly: true }).cost).toBe(OX_SWAP_CASH_ONLY_USD * OX_SWAP_GOLD_RUSH_MULT);
    expect(swapOxenCost(s, 1).goldRush).toBe(true);
  });
  it('1850 also Gold Rush; 1851 back to normal', () => {
    expect(swapOxenCost(game({ date: { year: 1850, month: 6, day: 15 } }), 1).goldRush).toBe(true);
    expect(swapOxenCost(game({ date: { year: 1851, month: 6, day: 15 } }), 1).goldRush).toBe(false);
  });
});

describe('#278 — swapOxen barter mode', () => {
  it('refuses when not at a landmark', () => {
    const s = game();
    expect(() => swapOxen(s, [], 1, { cashOnly: true })).toThrow(/not at a landmark/);
  });
  it('refuses at a post that does not offer ox_swap', () => {
    const s = game();
    const atKearny = { ...s, location: { ...s.location, atLandmarkId: 'ft_kearny' } };
    expect(() => swapOxen(atKearny, [], 1, { cashOnly: true })).toThrow(/does not run an ox swap/);
  });
  it('barter requires exactly 2 surrenders per fresh', () => {
    const s = atLaramie();
    expect(() => swapOxen(s, [s.oxen[0].id], 1)).toThrow(/2 surrendered per fresh/);
    expect(() => swapOxen(s, [s.oxen[0].id, s.oxen[1].id, s.oxen[2].id], 1)).toThrow(/2 surrendered per fresh/);
  });
  it('refuses unknown surrender ids', () => {
    const s = atLaramie();
    expect(() => swapOxen(s, ['ox-bogus', s.oxen[0].id], 1)).toThrow(/not in team/);
  });
  it('refuses when cash short on the boot', () => {
    const s = atLaramie({ cash: 10 });
    expect(() =>
      swapOxen(s, [s.oxen[0].id, s.oxen[1].id], 1)
    ).toThrow(/not enough cash/);
  });
  it('successful 2-for-1 swap removes surrenders, adds 1 fresh, deducts boot', () => {
    const s = atLaramie({ cash: 200 });
    const surrenderIds = [s.oxen[0].id, s.oxen[1].id];
    const before = s.oxen.length;
    const result = swapOxen(s, surrenderIds, 1);
    expect(result.surrenderedCount).toBe(2);
    expect(result.freshCount).toBe(1);
    expect(result.cost).toBe(OX_SWAP_BARTER_BOOT_USD);
    expect(result.state.oxen.length).toBe(before - 2 + 1);
    expect(result.state.cash).toBe(200 - OX_SWAP_BARTER_BOOT_USD);
    // The new ox is healthy, unfatigued, shod.
    const fresh = result.state.oxen.find((o) => !surrenderIds.includes(o.id) && o.health === 100);
    expect(fresh).toBeDefined();
    expect(fresh?.fatigue).toBe(0);
    expect(fresh?.shod).toBe(true);
  });
  it('successful 4-for-2 swap', () => {
    const s = atLaramie({ cash: 200 });
    const surrenderIds = s.oxen.slice(0, 4).map((o) => o.id);
    const before = s.oxen.length;
    const result = swapOxen(s, surrenderIds, 2);
    expect(result.state.oxen.length).toBe(before - 4 + 2);
    expect(result.state.cash).toBe(200 - OX_SWAP_BARTER_BOOT_USD * 2);
  });
  it('logs an event-log line naming the post + cost', () => {
    const s = atLaramie({ cash: 200 });
    const result = swapOxen(s, [s.oxen[0].id, s.oxen[1].id], 1);
    const last = result.state.eventLog.at(-1)?.text ?? '';
    expect(last).toMatch(/Fort Laramie/);
    expect(last).toMatch(/\$\d+/);
  });
});

describe('#278 — swapOxen cash-only mode', () => {
  it('skips surrender requirement', () => {
    const s = atLaramie({ cash: 200 });
    const result = swapOxen(s, [], 1, { cashOnly: true });
    expect(result.surrenderedCount).toBe(0);
    expect(result.freshCount).toBe(1);
    expect(result.state.oxen.length).toBe(s.oxen.length + 1);
  });
  it('charges higher per-head rate', () => {
    const s = atLaramie({ cash: 500 });
    const barter = swapOxen(s, [s.oxen[0].id, s.oxen[1].id], 1);
    const cash = swapOxen(s, [], 1, { cashOnly: true });
    expect(cash.cost).toBeGreaterThan(barter.cost);
  });
  it('1849 cash-only doubles', () => {
    const s = atLaramie({ cash: 500, date: { year: 1849, month: 6, day: 15 } });
    const result = swapOxen(s, [], 1, { cashOnly: true });
    expect(result.cost).toBe(OX_SWAP_CASH_ONLY_USD * OX_SWAP_GOLD_RUSH_MULT);
    expect(result.goldRush).toBe(true);
    expect(result.state.eventLog.at(-1)?.text ?? '').toMatch(/Gold Rush/i);
  });
});

describe('#278 — Persona.pickOxSwapCount', () => {
  function farLandmark() {
    return getLandmark('ft_laramie');
  }
  function nonSwapLandmark() {
    return getLandmark('ft_kearny');
  }

  it('all personas return 0 at posts without ox_swap', async () => {
    const { cautiousPersona, balancedPersona, aggressivePersona, chaosPersona } = await import('../src/lib/game/ai');
    const s = atLaramie({ cash: 500 }); // cash high, team default healthy
    expect(cautiousPersona.pickOxSwapCount(s, nonSwapLandmark(), makeRng('p'))).toBe(0);
    expect(balancedPersona.pickOxSwapCount(s, nonSwapLandmark(), makeRng('p'))).toBe(0);
    expect(aggressivePersona.pickOxSwapCount(s, nonSwapLandmark(), makeRng('p'))).toBe(0);
    expect(chaosPersona.pickOxSwapCount(s, nonSwapLandmark(), makeRng('p'))).toBe(0);
  });

  it('cautious skips when team is healthy and full', async () => {
    const { cautiousPersona } = await import('../src/lib/game/ai');
    const s = atLaramie();
    // Default starter team is full + healthy — cautious has buffer already.
    expect(cautiousPersona.pickOxSwapCount(s, farLandmark(), makeRng('p'))).toBe(0);
  });

  it('cautious swaps when team avg health drops below 70', async () => {
    const { cautiousPersona } = await import('../src/lib/game/ai');
    const s = atLaramie();
    const worn = {
      ...s,
      oxen: s.oxen.map((o) => ({ ...o, health: 60 }))
    };
    expect(cautiousPersona.pickOxSwapCount(worn, farLandmark(), makeRng('p'))).toBeGreaterThan(0);
  });

  it('balanced has tighter health floor than cautious', async () => {
    const { cautiousPersona, balancedPersona } = await import('../src/lib/game/ai');
    const s = atLaramie();
    // Health 60 — between balanced floor (55) and cautious floor (70).
    const wornMid = { ...s, oxen: s.oxen.map((o) => ({ ...o, health: 60 })) };
    expect(cautiousPersona.pickOxSwapCount(wornMid, farLandmark(), makeRng('p'))).toBeGreaterThan(0);
    expect(balancedPersona.pickOxSwapCount(wornMid, farLandmark(), makeRng('p'))).toBe(0);
  });

  it('aggressive only swaps when team is below minTeam', async () => {
    const { aggressivePersona } = await import('../src/lib/game/ai');
    const s = atLaramie();
    // Knock half the team out (alive count goes well below comfort).
    const thin = {
      ...s,
      oxen: s.oxen.map((o, i) => i < s.oxen.length - 1 ? { ...o, health: 0 } : o)
    };
    expect(aggressivePersona.pickOxSwapCount(thin, farLandmark(), makeRng('p'))).toBeGreaterThan(0);
  });

  it('aggressive does NOT swap on a healthy full team', async () => {
    const { aggressivePersona } = await import('../src/lib/game/ai');
    const s = atLaramie();
    expect(aggressivePersona.pickOxSwapCount(s, farLandmark(), makeRng('p'))).toBe(0);
  });

  it('#934 — at a big-gap post (Hall, 270 mi to Boise), balanced swaps a 60-health team', async () => {
    // Pre-#934: balanced health floor = 55, so 60 health → skip.
    // Post-#934: ≥150 mi gap bumps to 75 → 60 < 75 → swap.
    const { balancedPersona } = await import('../src/lib/game/ai');
    const s = game();
    const atHall = {
      ...s,
      location: { ...s.location, atLandmarkId: 'ft_hall', milesTraveled: 1340 },
      oxen: s.oxen.map((o) => ({ ...o, health: 60 }))
    };
    expect(balancedPersona.pickOxSwapCount(atHall, farLandmark(), makeRng('p'))).toBeGreaterThan(0);
  });

  it('#934 — at a big-gap post, aggressive swaps a 50-health team (was below its 30-floor)', async () => {
    // Pre-#934: aggressive only swaps below minTeam — health 50 didn't fire.
    // Post-#934: ≥200 mi gap bumps health floor 30 → 55 → 50 < 55 → swap.
    const { aggressivePersona } = await import('../src/lib/game/ai');
    const s = game();
    const atHall = {
      ...s,
      location: { ...s.location, atLandmarkId: 'ft_hall', milesTraveled: 1340 },
      oxen: s.oxen.map((o) => ({ ...o, health: 50 }))
    };
    expect(aggressivePersona.pickOxSwapCount(atHall, farLandmark(), makeRng('p'))).toBeGreaterThan(0);
  });

  it('#934 — at a small-gap post (Robidoux, 50 mi to Laramie), gap-aware boost does NOT fire', async () => {
    // Robidoux→Laramie is 50 mi, below all three personas' bigGapMiles.
    // So balanced at health 60 still skips (base floor 55).
    const { balancedPersona } = await import('../src/lib/game/ai');
    const s = game();
    const atRobidoux = {
      ...s,
      location: { ...s.location, atLandmarkId: 'robidoux_post', milesTraveled: 652 },
      oxen: s.oxen.map((o) => ({ ...o, health: 60 }))
    };
    expect(balancedPersona.pickOxSwapCount(atRobidoux, farLandmark(), makeRng('p'))).toBe(0);
  });

  it('chaos returns 0-3 oxen randomly', async () => {
    const { chaosPersona } = await import('../src/lib/game/ai');
    const s = atLaramie();
    const counts = new Set<number>();
    for (let i = 0; i < 100; i++) {
      counts.add(chaosPersona.pickOxSwapCount(s, farLandmark(), makeRng(`c${i}`)));
    }
    expect(counts.size).toBeGreaterThan(1);
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(3);
    }
  });
});
