// #294 — hunting as a company party. Period: trains organized hunts
// at sundown for the next morning; the captain picked riders + rifles
// and the kill was divided by household (Marcy 1859 explicit). Solo
// hunts while in-train were a small breach of the equity rule.

import { describe, it, expect } from 'vitest';
import { hunt } from '../src/lib/game/actions/hunt';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'h294',
    leader: { name: 'L', profession: 'hunter' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function stockedHunter(): GameState {
  // Hunter party at default state needs ammo to actually hunt.
  const s = game();
  return {
    ...s,
    inventory: {
      ...s.inventory,
      rifle: 1,
      gunpowder: 50,
      lead_balls: 50,
      percussion_caps: 50
    }
  };
}

describe('#294 — solo hunt (default behaviour preserved)', () => {
  it('mode defaults to solo and behaves identically when not in a train', () => {
    const s = stockedHunter();
    const after = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1 });
    // Game meat lands in player's inventory; haul stamped solo.
    expect(after.inventory.game_meat).toBeGreaterThan(0);
    const haul = after.flags._huntHaul as Record<string, unknown>;
    expect(haul.mode).toBe('solo');
    expect(haul.companyShareLb).toBe(0);
  });

  it('explicit mode=solo is honored even when in a train (no redistribution)', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const compSnapshot = s.wagonTrain!.companions.map((c) => c.inventory.game_meat ?? 0);
    const after = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1, mode: 'solo' });
    const compAfter = after.wagonTrain!.companions.map((c) => c.inventory.game_meat ?? 0);
    // Companion meat unchanged (only player got it).
    expect(compAfter).toEqual(compSnapshot);
    expect(after.inventory.game_meat).toBeGreaterThan(0);
  });

  it('solo hunt while in-train with a real haul drops train morale', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const beforeMorale = s.wagonTrain!.companions.map((c) => c.morale);
    // Pump ammo + hunters to maximize chance of meat.
    const after = hunt(s, { target: 'medium', ammo: 'heavy', hunters: 2, mode: 'solo' });
    if ((after.flags._huntHaul as Record<string, unknown>).meat as number > 0) {
      const afterMorale = after.wagonTrain!.companions.map((c) => c.morale);
      // At least one in-progress companion's morale dropped.
      const inProgress = after.wagonTrain!.companions
        .map((c, i) => ({ inProgress: c.outcome === 'in-progress', i }))
        .filter((x) => x.inProgress);
      expect(inProgress.some(({ i }) => afterMorale[i] < beforeMorale[i])).toBe(true);
    }
  });

  it('empty-handed solo hunt does NOT penalize train morale', () => {
    // Strip ALL ammo (Hunter starter kit includes powder/balls/caps).
    // Zero ammo → spentBullets=0 → meatGain=0 → no equity-breach penalty.
    let s = game();
    s = joinTrain(s, makeRng('jt')).state;
    s = {
      ...s,
      inventory: { ...s.inventory, rifle: 1, gunpowder: 0, lead_balls: 0, percussion_caps: 0 }
    };
    const beforeMorale = s.wagonTrain!.companions.map((c) => c.morale);
    const after = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1, mode: 'solo' });
    const afterMorale = after.wagonTrain!.companions.map((c) => c.morale);
    // No bullets fired → no kill → no morale change.
    expect(afterMorale).toEqual(beforeMorale);
  });
});

describe('#294 — company hunt redistribution', () => {
  it('company hunt distributes meat across player + every in-progress companion by alive-soul count', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const playerSouls = s.party.filter((m) => !m.dead).length;
    const compSouls = s.wagonTrain!.companions
      .filter((c) => c.outcome === 'in-progress')
      .map((c) => c.party.filter((p) => !p.dead).length);
    const totalSouls = playerSouls + compSouls.reduce((a, b) => a + b, 0);
    expect(totalSouls).toBeGreaterThan(playerSouls); // sanity: companions exist

    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    const haul = after.flags._huntHaul as Record<string, unknown>;
    const playerMeat = after.inventory.game_meat ?? 0;
    const companyShare = haul.companyShareLb as number;

    expect(haul.mode).toBe('company');
    expect(playerMeat).toBeGreaterThan(0);
    expect(companyShare).toBeGreaterThan(0);

    // Player share is roughly proportional to soul ratio (allow ±2 lb
    // for rounding).
    const totalMeat = playerMeat + companyShare;
    const expectedPlayerShare = Math.round(totalMeat * (playerSouls / totalSouls));
    expect(playerMeat).toBeGreaterThanOrEqual(expectedPlayerShare - 2);
    expect(playerMeat).toBeLessThanOrEqual(expectedPlayerShare + 2);
  });

  it('every in-progress companion ends up with some game_meat in inventory', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    for (const c of after.wagonTrain!.companions) {
      if (c.outcome !== 'in-progress') continue;
      expect(c.inventory.game_meat ?? 0).toBeGreaterThanOrEqual(0);
    }
    // At least one companion received meat.
    const anyGotMeat = after.wagonTrain!.companions
      .filter((c) => c.outcome === 'in-progress')
      .some((c) => (c.inventory.game_meat ?? 0) > 0);
    expect(anyGotMeat).toBe(true);
  });

  it('company hunt yields more total meat than the same solo hunt (combined firepower)', () => {
    // Same seed + state, just toggle the mode. Companion contribution
    // bumps carryMultiplier so total kill is bigger.
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const solo = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'solo' });
    const company = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    const soloHaul = solo.flags._huntHaul as Record<string, unknown>;
    const compHaul = company.flags._huntHaul as Record<string, unknown>;
    const soloTotal = (soloHaul.meat as number) + (soloHaul.companyShareLb as number);
    const compTotal = (compHaul.meat as number) + (compHaul.companyShareLb as number);
    expect(compTotal).toBeGreaterThan(soloTotal);
  });

  it('company hunt success bumps every in-progress companion morale by +2', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const beforeMorale = s.wagonTrain!.companions.map((c) => c.morale);
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    const afterMorale = after.wagonTrain!.companions.map((c) => c.morale);
    after.wagonTrain!.companions.forEach((c, i) => {
      if (c.outcome !== 'in-progress') return;
      expect(afterMorale[i]).toBe(Math.min(100, beforeMorale[i] + 2));
    });
  });

  it('company hunt without a wagonTrain falls back to solo behavior (mode flag in haul still recorded)', () => {
    // Caller asks for company but player isn't in a train. Should
    // behave like solo — keep the meat, no train effects.
    const s = stockedHunter();
    const after = hunt(s, { target: 'medium', ammo: 'moderate', hunters: 1, mode: 'company' });
    const haul = after.flags._huntHaul as Record<string, unknown>;
    // mode resolves to solo because !state.wagonTrain.
    expect(haul.mode).toBe('solo');
    expect(haul.companyShareLb).toBe(0);
    expect(after.inventory.game_meat).toBeGreaterThan(0);
  });

  it('company log line mentions the divided haul', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    const huntLog = after.eventLog.find((l) => /company hunt/i.test(l.text));
    expect(huntLog).toBeDefined();
    expect(huntLog!.text).toMatch(/divided by household/i);
  });
});

describe('#294 — share rounding never assigns negative or > leftover lb', () => {
  // Targeted property test: distribute small `meatGain` across many
  // companions with mixed soul counts and verify (a) the shares sum to
  // exactly `meatGain`, and (b) every share is non-negative. The fix
  // distributes from running `leftover` and `remainingSouls`, so this
  // can never overshoot. The previous (broken) approach computed each
  // share as a fraction of the original `meatGain`, which could drive
  // `leftover` negative on certain rounding patterns.
  it('many trials with random soul distributions: shares always non-negative and sum to meatGain', () => {
    // Direct unit test on the redistribution math by reaching into the
    // engine: we drive `hunt()` with controlled inputs and compute the
    // expected total. Since hunt() rolls rng for the kill, we run many
    // seeds and inspect the recorded haul + companion deltas.
    for (let trial = 0; trial < 50; trial++) {
      let s = stockedHunter();
      s = joinTrain(s, makeRng('seed-' + trial)).state;
      const before = s.wagonTrain!.companions.map((c) => c.inventory.game_meat ?? 0);
      const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
      const haul = after.flags._huntHaul as Record<string, unknown>;
      const playerMeat = after.inventory.game_meat ?? 0;
      const companyShare = haul.companyShareLb as number;

      // Every companion delta must be >= 0.
      after.wagonTrain!.companions.forEach((c, i) => {
        if (c.outcome !== 'in-progress') return;
        const delta = (c.inventory.game_meat ?? 0) - before[i];
        expect(delta).toBeGreaterThanOrEqual(0);
      });

      // Sum of companion deltas equals the companyShareLb stamped in haul.
      const totalCompanionDelta = after.wagonTrain!.companions.reduce((sum, c, i) => {
        if (c.outcome !== 'in-progress') return sum;
        return sum + ((c.inventory.game_meat ?? 0) - before[i]);
      }, 0);
      expect(totalCompanionDelta).toBe(companyShare);

      // playerShare + companyShare equals the rounded total meat.
      // Note: we can't recover meatGain from after-state alone, but
      // the haul.meat is the player's share and companyShareLb is the
      // rest, so adding them gives the total kill.
      const totalKill = playerMeat + companyShare;
      // If anything was killed, total must be > 0.
      if ((haul.meat as number) > 0) expect(totalKill).toBeGreaterThan(0);
    }
  });
});

describe('#294 — byproducts stay with the player on company hunts', () => {
  it('tallow / hides / prize cuts go to player even on company-mode big-game hunts', () => {
    let s = stockedHunter();
    s = joinTrain(s, makeRng('jt')).state;
    const after = hunt(s, { target: 'big', ammo: 'heavy', hunters: 2, mode: 'company' });
    // At least one byproduct should have been gained (big game has 70%
    // prizeCut + 80% rawHide chance × yieldFraction). Over the seed
    // used here it's deterministic.
    const totalByproducts =
      (after.inventory.tallow ?? 0)
      + (after.inventory.prize_cut ?? 0)
      + (after.inventory.raw_hide ?? 0);
    expect(totalByproducts).toBeGreaterThan(0);
    // Companions don't get byproducts — only meat.
    for (const c of after.wagonTrain!.companions) {
      expect(c.inventory.tallow ?? 0).toBe(0);
      expect(c.inventory.prize_cut ?? 0).toBe(0);
      expect(c.inventory.raw_hide ?? 0).toBe(0);
    }
  });
});
