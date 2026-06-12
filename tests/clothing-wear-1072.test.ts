// #1072 — Clothing wear engine tests.
// Covers §§1–3 of docs/superpowers/specs/2026-06-12-clothing-wear-design.md.

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import {
  applyClothingWear,
  getClothingCondition,
  getFootwearCondition,
  GARMENT_WEAR_PER_MILE,
  FOOTWEAR_WEAR_PER_MILE,
  TERRAIN_WEAR_MULT,
  GARMENT_ROT_PER_DAY,
  FOOTWEAR_ROT_PER_DAY,
  MOISTURE_FORD_GARMENT,
  MOISTURE_FORD_FOOTWEAR,
  MOISTURE_STORM_GARMENT,
  MOISTURE_STORM_FOOTWEAR,
  MOISTURE_RAIN_GARMENT,
  MOISTURE_RAIN_FOOTWEAR,
  MOISTURE_DAMP_DAILY_GARMENT,
  COLD_MINOR_GARMENT,
  FOOTWEAR_SLOW_THRESHOLD,
  FOOTWEAR_HALT_THRESHOLD,
  FOOTWEAR_HP_NICK,
  GARMENT_MORALE_DRAG_THRESHOLD,
  GARMENT_MORALE_DRAG
} from '../src/lib/game/systems/clothing-wear';
import { warmthFor, WARMTH_CONDITION_FLOOR } from '../src/lib/game/systems/warmth';
import { milesPerDay } from '../src/lib/game/systems/travel';
import { synthesizeWagonState, projectWagonDeltas } from '../src/lib/game/systems/wagon-synth';
import type { GameState, NpcWagonState } from '../src/lib/game/types';
import type { TickCtx } from '../src/lib/game/daily-steps';
import { makeRng } from '../src/lib/game/rng';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'clothing-wear-1072',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
  return { ...s, ...overrides };
}

/** Build a TickCtx for a travel day. */
function travelCtx(miles: number, overrides: Partial<TickCtx> = {}): TickCtx {
  return { traveled: true, driver: 'player', milesTraveledToday: miles, ...overrides };
}

/** Build a TickCtx for a rest day (zero miles). */
function restCtx(overrides: Partial<TickCtx> = {}): TickCtx {
  return { traveled: false, driver: 'player', milesTraveledToday: 0, ...overrides };
}

/** Minimal NPC wagon for synth round-trip tests. */
function freshNpcWagon(overrides: Partial<NpcWagonState> = {}): NpcWagonState {
  const base: NpcWagonState = {
    id: 'cw-npc',
    name: 'the Test family',
    leaderProfession: 'farmer',
    hasChildren: false,
    seed: 'cw-npc',
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    waterRation: 'normal',
    party: [
      {
        id: 'cw-p0',
        name: 'John Test',
        sex: 'male',
        kind: 'adult',
        isLeader: true,
        profession: 'farmer',
        age: 32,
        health: 100,
        cleanliness: 100,
        conditions: [],
        dead: false
      }
    ],
    inventory: { flour: 400, bacon: 200 },
    oxen: [
      { id: 'cw-ox-0', health: 100, fatigue: 0, shod: true },
      { id: 'cw-ox-1', health: 100, fatigue: 0, shod: true }
    ],
    cash: 50,
    morale: 60,
    water: 20,
    dirtyWater: 0,
    waterCap: 20,
    dryDays: 0,
    clothingCondition: 80,
    footwearCondition: 60,
    wagon: {
      model: 'prairie_schooner',
      condition: 100,
      canvas: 100,
      carryCapacity: 2000,
      impairment: null
    }
  };
  return { ...base, ...overrides } as NpcWagonState;
}

// ─── §1: Default values ────────────────────────────────────────────────────────

describe('#1072 §1 — default values', () => {
  it('new game starts both tracks at 100', () => {
    const s = newGame();
    expect(s.resources.clothingCondition).toBe(100);
    expect(s.resources.footwearCondition).toBe(100);
  });

  it('?? 100 fallback for legacy saves (resources missing fields)', () => {
    const s = newGame({
      resources: { water: 20, waterCap: 30 } // no clothingCondition/footwearCondition
    });
    expect(getClothingCondition(s)).toBe(100);
    expect(getFootwearCondition(s)).toBe(100);
  });
});

// ─── §2: Wear engine ──────────────────────────────────────────────────────────

describe('#1072 §2 — abrasion accrues on travel days, only rot on rest days', () => {
  it('travel day: both tracks decrease by more than rot alone (abrasion + rot)', () => {
    const s = newGame({ weather: 'clear' });
    const miles = 20;
    const after = applyClothingWear(s, travelCtx(miles));

    const garBefore = getClothingCondition(s);
    const fwBefore  = getFootwearCondition(s);
    const garAfter  = getClothingCondition(after);
    const fwAfter   = getFootwearCondition(after);

    // Expected: rot + abrasion. Prairie mult = 1.0.
    const expectedGarLoss = GARMENT_ROT_PER_DAY + GARMENT_WEAR_PER_MILE * miles * TERRAIN_WEAR_MULT['prairie'];
    const expectedFwLoss  = FOOTWEAR_ROT_PER_DAY + FOOTWEAR_WEAR_PER_MILE * miles * TERRAIN_WEAR_MULT['prairie'];

    expect(garBefore - garAfter).toBeCloseTo(expectedGarLoss, 3);
    expect(fwBefore - fwAfter).toBeCloseTo(expectedFwLoss, 3);

    // Abrasion contributes more than zero extra.
    expect(garBefore - garAfter).toBeGreaterThan(GARMENT_ROT_PER_DAY);
    expect(fwBefore - fwAfter).toBeGreaterThan(FOOTWEAR_ROT_PER_DAY);
  });

  it('rest day: only rot fires (no abrasion component)', () => {
    const s = newGame({ weather: 'clear' });
    const after = applyClothingWear(s, restCtx());

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    const fwLoss  = getFootwearCondition(s) - getFootwearCondition(after);

    // Exact rot per day.
    expect(garLoss).toBeCloseTo(GARMENT_ROT_PER_DAY, 3);
    expect(fwLoss).toBeCloseTo(FOOTWEAR_ROT_PER_DAY, 3);
  });
});

describe('#1072 §2 — terrain multiplier ordering', () => {
  it('desert > forest > prairie for abrasion at same miles', () => {
    const miles = 20;
    function lossOnTerrain(terrain: 'prairie' | 'forest' | 'desert'): { gar: number; fw: number } {
      const s = newGame({ weather: 'clear', location: { ...newGame().location, terrain } });
      const after = applyClothingWear(s, travelCtx(miles));
      return {
        gar: getClothingCondition(s) - getClothingCondition(after),
        fw:  getFootwearCondition(s) - getFootwearCondition(after)
      };
    }
    const prairie = lossOnTerrain('prairie');
    const forest  = lossOnTerrain('forest');
    const desert  = lossOnTerrain('desert');

    expect(forest.gar).toBeGreaterThan(prairie.gar);
    expect(desert.gar).toBeGreaterThan(forest.gar);
    expect(forest.fw).toBeGreaterThan(prairie.fw);
    expect(desert.fw).toBeGreaterThan(forest.fw);
  });

  it('mountains multiplier is the highest (1.6)', () => {
    const miles = 20;
    function garLoss(terrain: 'desert' | 'mountains'): number {
      const s = newGame({ weather: 'clear', location: { ...newGame().location, terrain } });
      const after = applyClothingWear(s, travelCtx(miles));
      return getClothingCondition(s) - getClothingCondition(after);
    }
    expect(garLoss('mountains')).toBeGreaterThan(garLoss('desert'));
  });
});

describe('#1072 §2 — moisture spike + damp persistence', () => {
  it('ford day: ford moisture spike applied and _clothingDampSinceDay set', () => {
    const s = newGame({
      weather: 'clear',
      flags: { ...newGame().flags, _fordedToday: true }
    });
    const after = applyClothingWear(s, travelCtx(20));

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    const fwLoss  = getFootwearCondition(s) - getFootwearCondition(after);

    // Must include the ford spike on top of normal wear.
    const plainGarLoss = GARMENT_ROT_PER_DAY + GARMENT_WEAR_PER_MILE * 20 * TERRAIN_WEAR_MULT['prairie'];
    const plainFwLoss  = FOOTWEAR_ROT_PER_DAY + FOOTWEAR_WEAR_PER_MILE * 20 * TERRAIN_WEAR_MULT['prairie'];

    expect(garLoss).toBeCloseTo(plainGarLoss + MOISTURE_FORD_GARMENT, 2);
    expect(fwLoss).toBeCloseTo(plainFwLoss + MOISTURE_FORD_FOOTWEAR, 2);

    // Damp flag should be set.
    expect(after.flags._clothingDampSinceDay).toBe(s.day);
    // Ford flag should be cleared.
    expect(after.flags._fordedToday).toBe(false);
  });

  it('storm day: storm moisture spike applied', () => {
    const s = newGame({ weather: 'storm' });
    const after = applyClothingWear(s, travelCtx(10));

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    const fwLoss  = getFootwearCondition(s) - getFootwearCondition(after);

    const plainGarLoss = GARMENT_ROT_PER_DAY + GARMENT_WEAR_PER_MILE * 10 * TERRAIN_WEAR_MULT['prairie'];
    const plainFwLoss  = FOOTWEAR_ROT_PER_DAY + FOOTWEAR_WEAR_PER_MILE * 10 * TERRAIN_WEAR_MULT['prairie'];

    expect(garLoss).toBeCloseTo(plainGarLoss + MOISTURE_STORM_GARMENT, 2);
    expect(fwLoss).toBeCloseTo(plainFwLoss + MOISTURE_STORM_FOOTWEAR, 2);
    expect(typeof after.flags._clothingDampSinceDay).toBe('number');
  });

  it('rain day: rain moisture spike applied', () => {
    const s = newGame({ weather: 'rain' });
    const after = applyClothingWear(s, travelCtx(10));

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    const plainGarLoss = GARMENT_ROT_PER_DAY + GARMENT_WEAR_PER_MILE * 10 * TERRAIN_WEAR_MULT['prairie'];

    expect(garLoss).toBeCloseTo(plainGarLoss + MOISTURE_RAIN_GARMENT, 2);
    expect(getFootwearCondition(s) - getFootwearCondition(after))
      .toBeCloseTo(FOOTWEAR_ROT_PER_DAY + FOOTWEAR_WEAR_PER_MILE * 10 * TERRAIN_WEAR_MULT['prairie'] + MOISTURE_RAIN_FOOTWEAR, 2);
  });

  it('damp persists: extra MOISTURE_DAMP_DAILY_GARMENT each non-clear day while flag set', () => {
    // Start with damp flag already set (from a previous soak).
    const s = newGame({
      weather: 'overcast', // not clear → damp persists
      flags: { ...newGame().flags, _clothingDampSinceDay: newGame().day - 1 }
    });
    const after = applyClothingWear(s, restCtx());

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    // Should include rot + damp extra (no abrasion, no moisture spike since overcast).
    expect(garLoss).toBeCloseTo(GARMENT_ROT_PER_DAY + MOISTURE_DAMP_DAILY_GARMENT, 3);
    // Damp flag still present (not clear day).
    expect(typeof after.flags._clothingDampSinceDay).toBe('number');
  });

  it('clear day clears the damp flag', () => {
    const s = newGame({
      weather: 'clear',
      flags: { ...newGame().flags, _clothingDampSinceDay: newGame().day - 2 }
    });
    const after = applyClothingWear(s, restCtx());
    expect(after.flags._clothingDampSinceDay).toBeUndefined();
  });
});

describe('#1072 §2 — cold minor secondary (frost / snow)', () => {
  it('frost day: extra COLD_MINOR_GARMENT penalty on garments', () => {
    const s = newGame({ weather: 'frost' });
    const after = applyClothingWear(s, restCtx());

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    expect(garLoss).toBeCloseTo(GARMENT_ROT_PER_DAY + COLD_MINOR_GARMENT, 3);
  });

  it('snow day: extra COLD_MINOR_GARMENT penalty on garments', () => {
    const s = newGame({ weather: 'snow' });
    const after = applyClothingWear(s, restCtx());

    const garLoss = getClothingCondition(s) - getClothingCondition(after);
    expect(garLoss).toBeCloseTo(GARMENT_ROT_PER_DAY + COLD_MINOR_GARMENT, 3);
  });

  it('cold day does NOT add extra to footwear', () => {
    const s = newGame({ weather: 'frost' });
    const after = applyClothingWear(s, restCtx());
    const fwLoss = getFootwearCondition(s) - getFootwearCondition(after);
    // Only rot on footwear (no cold minor).
    expect(fwLoss).toBeCloseTo(FOOTWEAR_ROT_PER_DAY, 3);
  });
});

// ─── §3: Consequences ─────────────────────────────────────────────────────────

describe('#1072 §3 — warmth scaling with condition floor', () => {
  it('full kit at 100 condition = same warmth as before (no penalty)', () => {
    const s = newGame({
      inventory: { coat: 2, blanket: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 100, footwearCondition: 100 }
    });
    // Warmth at 100 condition should be ~unchanged from the old formula.
    const w = warmthFor(s);
    expect(w).toBeGreaterThan(0);
    // Spot check: 2 coats per 2 alive = 25 pts each × 1.0 garment mult,
    // 2 blankets = 25 pts each × 1.0, 2 boots = 15 pts each × 1.0.
    // Total = (50+50+30) / 2 = 65.
    expect(w).toBe(65);
  });

  it('degraded clothing reduces warmth below full-condition value', () => {
    const s50 = newGame({
      inventory: { coat: 2, blanket: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 50, footwearCondition: 50 }
    });
    const s100 = newGame({
      inventory: { coat: 2, blanket: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 100, footwearCondition: 100 }
    });
    expect(warmthFor(s50)).toBeLessThan(warmthFor(s100));
  });

  it('floor: at 0 condition, warmth is still at least WARMTH_CONDITION_FLOOR × full', () => {
    const s = newGame({
      inventory: { coat: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 0, footwearCondition: 0 }
    });
    const sFull = newGame({
      inventory: { coat: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 100, footwearCondition: 100 }
    });
    // Warmth at 0 condition must be ≥ floor * full-condition warmth.
    expect(warmthFor(s)).toBeGreaterThanOrEqual(
      Math.round(warmthFor(sFull) * WARMTH_CONDITION_FLOOR * 0.9) // small tolerance
    );
  });

  it('footwear items use footwearCondition, garment items use clothingCondition', () => {
    // Set garments=100, footwear=0 → boots/moccasins should be at floor, coat fine.
    const s = newGame({
      inventory: { coat: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 100, footwearCondition: 0 }
    });
    const sFull = newGame({
      inventory: { coat: 2, boots: 2 },
      resources: { ...newGame().resources, clothingCondition: 100, footwearCondition: 100 }
    });
    // Warmth should be lower when footwear is at 0 vs 100.
    expect(warmthFor(s)).toBeLessThan(warmthFor(sFull));
  });
});

describe('#1072 §3 — footwear pace multipliers', () => {
  it('footwear > SLOW_THRESHOLD: no penalty (mult = 1.0)', () => {
    const s50 = newGame({
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_SLOW_THRESHOLD + 1 }
    });
    const s100 = newGame({
      resources: { ...newGame().resources, footwearCondition: 100 }
    });
    expect(milesPerDay(s50)).toBe(milesPerDay(s100));
  });

  it('footwear at SLOW_THRESHOLD (25): pace × 0.95', () => {
    const sGood = newGame({
      resources: { ...newGame().resources, footwearCondition: 100 }
    });
    const sSlow = newGame({
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_SLOW_THRESHOLD }
    });
    const expectedMiles = Math.round(milesPerDay(sGood) * 0.95);
    expect(milesPerDay(sSlow)).toBe(expectedMiles);
  });

  it('footwear at HALT_THRESHOLD (10): pace × 0.90', () => {
    const sGood = newGame({
      resources: { ...newGame().resources, footwearCondition: 100 }
    });
    const sHalt = newGame({
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_HALT_THRESHOLD }
    });
    const expectedMiles = Math.round(milesPerDay(sGood) * 0.90);
    expect(milesPerDay(sHalt)).toBe(expectedMiles);
  });
});

describe('#1072 §3 — footwear HP nick at ≤10 on rough terrain only', () => {
  it('footwear ≤10 on desert: alive members take -1 HP', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_HALT_THRESHOLD }
    });
    const hpBefore = s.party.filter(m => !m.dead).map(m => m.health);
    const after = applyClothingWear(s, restCtx());
    const hpAfter = after.party.filter(m => !m.dead).map(m => m.health);
    for (let i = 0; i < hpBefore.length; i++) {
      expect(hpBefore[i] - hpAfter[i]).toBe(FOOTWEAR_HP_NICK);
    }
  });

  it('footwear ≤10 on mountains: alive members take -1 HP', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'mountains' },
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_HALT_THRESHOLD }
    });
    const hpBefore = s.party.filter(m => !m.dead).map(m => m.health);
    const after = applyClothingWear(s, restCtx());
    const hpAfter = after.party.filter(m => !m.dead).map(m => m.health);
    for (let i = 0; i < hpBefore.length; i++) {
      expect(hpBefore[i] - hpAfter[i]).toBe(FOOTWEAR_HP_NICK);
    }
  });

  it('footwear ≤10 on prairie: NO HP nick', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'prairie' },
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_HALT_THRESHOLD }
    });
    const hpBefore = s.party.filter(m => !m.dead).map(m => m.health);
    const after = applyClothingWear(s, restCtx());
    const hpAfter = after.party.filter(m => !m.dead).map(m => m.health);
    for (let i = 0; i < hpBefore.length; i++) {
      expect(hpAfter[i]).toBe(hpBefore[i]);
    }
  });

  it('footwear 11 on desert (above HALT_THRESHOLD): no HP nick', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'desert' },
      resources: { ...newGame().resources, footwearCondition: FOOTWEAR_HALT_THRESHOLD + 1 }
    });
    const hpBefore = s.party.filter(m => !m.dead).map(m => m.health);
    const after = applyClothingWear(s, restCtx());
    const hpAfter = after.party.filter(m => !m.dead).map(m => m.health);
    for (let i = 0; i < hpBefore.length; i++) {
      expect(hpAfter[i]).toBe(hpBefore[i]);
    }
  });
});

describe('#1072 §3 — garment morale drag <25', () => {
  it('garments < 25: morale drops by GARMENT_MORALE_DRAG per tick', () => {
    const s = newGame({
      resources: {
        ...newGame().resources,
        clothingCondition: GARMENT_MORALE_DRAG_THRESHOLD - 1 // just below threshold
      }
    });
    const moraleBefore = s.morale;
    const after = applyClothingWear(s, restCtx());
    // Morale should drop by at least the drag amount (may drop more from other effects
    // if condition is very low, but drag must fire).
    expect(moraleBefore - after.morale).toBeGreaterThanOrEqual(GARMENT_MORALE_DRAG);
  });

  it('garments exactly 25: no morale drag (threshold is strict <)', () => {
    // Start at exactly the threshold — the condition will fall slightly after the rot,
    // so we need to start at a value where after the rot it's still >= 25.
    // Use 25.2 (just above) — after 0.15 rot it becomes 25.05, still >= 25.
    const s = newGame({
      resources: {
        ...newGame().resources,
        clothingCondition: GARMENT_MORALE_DRAG_THRESHOLD + 0.2
      }
    });
    const moraleBefore = s.morale;
    const after = applyClothingWear(s, restCtx());
    // No morale drag at this condition level.
    expect(after.morale).toBe(moraleBefore);
  });

  it('garments > 25: no morale drag', () => {
    const s = newGame({
      resources: {
        ...newGame().resources,
        clothingCondition: 60 // well above threshold
      }
    });
    const moraleBefore = s.morale;
    const after = applyClothingWear(s, restCtx());
    expect(after.morale).toBe(moraleBefore);
  });
});

// ─── §6.3: Threshold log lines ───────────────────────────────────────────────

describe('#1072 §6.3 — threshold log lines fire once and re-arm', () => {
  it('garments 50 crossing: fires once, re-arms on recovery', () => {
    // Start just above 50, cross below on the first tick.
    const s = newGame({
      weather: 'clear',
      resources: { ...newGame().resources, clothingCondition: 50.1 }
    });
    const after1 = applyClothingWear(s, restCtx()); // crosses 50 (50.1 - 0.15 = 49.95)
    const log1 = after1.eventLog.find(e => /dreadful on one's clothes/i.test(e.text));
    expect(log1).toBeDefined();
    expect(after1.flags._clothingWarnGarment50).toBe(true);

    // Second tick at same low value — should NOT fire again.
    const after2 = applyClothingWear(after1, restCtx());
    const newLogs = after2.eventLog.filter(e =>
      !after1.eventLog.includes(e) && /dreadful on one's clothes/i.test(e.text)
    );
    expect(newLogs).toHaveLength(0);

    // Recovery above 50: re-arm (flag cleared).
    const recovered = {
      ...after2,
      resources: { ...after2.resources, clothingCondition: 55 }
    };
    const afterRecovered = applyClothingWear(recovered, restCtx());
    expect(afterRecovered.flags._clothingWarnGarment50).toBeUndefined();

    // Now drop below 50 again — should fire once more.
    const droppedAgain = {
      ...afterRecovered,
      resources: { ...afterRecovered.resources, clothingCondition: 50.1 }
    };
    const afterDrop = applyClothingWear(droppedAgain, restCtx());
    const log3 = afterDrop.eventLog.find(e => /dreadful on one's clothes/i.test(e.text));
    expect(log3).toBeDefined();
  });

  it('garments 25 crossing: verbatim period log fires once', () => {
    const s = newGame({
      weather: 'clear',
      resources: { ...newGame().resources, clothingCondition: 25.1 }
    });
    const after = applyClothingWear(s, restCtx());
    const log = after.eventLog.find(e => /in rags/i.test(e.text) || /best.*dress/i.test(e.text));
    expect(log).toBeDefined();
    expect(after.flags._clothingWarnGarment25).toBe(true);

    // Does not fire again on next tick.
    const after2 = applyClothingWear(after, restCtx());
    const newLog = after2.eventLog.find(e =>
      !after.eventLog.includes(e) && (/in rags/i.test(e.text) || /best.*dress/i.test(e.text))
    );
    expect(newLog).toBeUndefined();
  });

  it('footwear 25 crossing: verbatim period log fires once', () => {
    const s = newGame({
      weather: 'clear',
      resources: { ...newGame().resources, footwearCondition: 25.1 }
    });
    const after = applyClothingWear(s, restCtx());
    const log = after.eventLog.find(e => /boots worn through/i.test(e.text) || /rag.*feet/i.test(e.text));
    expect(log).toBeDefined();
    expect(after.flags._clothingWarnFootwear25).toBe(true);
  });
});

// ─── NPC synth round-trip ─────────────────────────────────────────────────────

describe('#1072 — NPC synth round-trip for clothingCondition and footwearCondition', () => {
  it('synthesizeWagonState carries clothing tracks into the synth', () => {
    const wagon = freshNpcWagon({ clothingCondition: 72, footwearCondition: 45 });
    const env = {
      day: 50,
      date: { year: 1849, month: 6, day: 5 },
      location: {
        trailPosition: 0.3,
        nextLandmarkId: 'ft_kearny',
        previousLandmarkId: null,
        milesTraveled: 500,
        terrain: 'prairie' as const
      },
      weather: 'clear' as const,
      pace: 'moderate' as const
    };
    const synth = synthesizeWagonState(wagon, env);
    expect(synth.resources.clothingCondition).toBe(72);
    expect(synth.resources.footwearCondition).toBe(45);
  });

  it('projectWagonDeltas writes changed values back to NPC fields', () => {
    const wagon = freshNpcWagon({ clothingCondition: 72, footwearCondition: 45 });
    const env = {
      day: 50,
      date: { year: 1849, month: 6, day: 5 },
      location: {
        trailPosition: 0.3,
        nextLandmarkId: 'ft_kearny',
        previousLandmarkId: null,
        milesTraveled: 500,
        terrain: 'prairie' as const
      },
      weather: 'clear' as const,
      pace: 'moderate' as const
    };
    const synth = synthesizeWagonState(wagon, env);

    // Simulate the engine modifying the condition in the synth.
    const modified: GameState = {
      ...synth,
      resources: {
        ...synth.resources,
        clothingCondition: 68,
        footwearCondition: 40
      }
    };

    const projected = projectWagonDeltas(modified, wagon);
    expect(projected.clothingCondition).toBe(68);
    expect(projected.footwearCondition).toBe(40);
  });

  it('NPC default 100 when fields absent (legacy wagon)', () => {
    const legacyWagon = freshNpcWagon();
    // Remove the optional fields to simulate a legacy save.
    const { clothingCondition, footwearCondition, ...withoutClothing } = legacyWagon;
    void clothingCondition; void footwearCondition; // suppress unused-var
    const env = {
      day: 1,
      date: { year: 1849, month: 4, day: 15 },
      location: {
        trailPosition: 0,
        nextLandmarkId: 'kansas_river',
        previousLandmarkId: null,
        milesTraveled: 0,
        terrain: 'prairie' as const
      },
      weather: 'clear' as const,
      pace: 'moderate' as const
    };
    const synth = synthesizeWagonState(withoutClothing as NpcWagonState, env);
    expect(synth.resources.clothingCondition).toBe(100);
    expect(synth.resources.footwearCondition).toBe(100);
  });

  it('NPC wear accrues through a full tickNpcWagon call (integration)', () => {
    const wagon = freshNpcWagon({ clothingCondition: 80, footwearCondition: 70 });
    const ctx = {
      day: 20,
      traveled: true,
      pace: 'moderate' as const,
      terrain: 'prairie' as const,
      weather: 'clear' as const,
      traveledMiles: 18,
      date: { year: 1849, month: 5, day: 20 },
      location: {
        trailPosition: 0.2,
        nextLandmarkId: 'ft_kearny',
        previousLandmarkId: null,
        milesTraveled: 300,
        terrain: 'prairie' as const
      },
      companyRestMode: 'travel' as const
    };
    const result = tickNpcWagon(wagon, ctx, makeRng('cw-npc-int'));
    // Both tracks should have decreased from wear.
    expect((result.wagon.clothingCondition ?? 100)).toBeLessThan(80);
    expect((result.wagon.footwearCondition ?? 100)).toBeLessThan(70);
  });
});
