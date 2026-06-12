// #1072 / #1193 — §4 Restoration + §5 Agent brains tests.
// Covers: mend_clothes, stitch_moccasins extension, settleTrade bumps,
// wash_clothes damp clear, bundle urgency, shopping slice, NPC camp action.

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { CAMP_ACTIONS_BY_ID } from '../src/lib/game/actions/camp-actions';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { urgency } from '../src/lib/game/ai/bundle';
import {
  pickEquipmentRestock,
  type ShoppingInput
} from '../src/lib/game/ai/shopping';
import type { GameState } from '../src/lib/game/types';
import { makeRng } from '../src/lib/game/rng';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'mend-1193',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
  return { ...s, ...overrides };
}

/** Build a minimal trade state located at ft_laramie. */
function atLaramie(overrides: Partial<GameState> = {}): GameState {
  const s = newGame({
    location: {
      trailPosition: 0.4,
      nextLandmarkId: 'register_cliff',
      previousLandmarkId: 'ft_laramie',
      milesTraveled: 640,
      terrain: 'prairie',
      atLandmarkId: 'ft_laramie'
    },
    cash: 500
  });
  return { ...s, ...overrides };
}

// ─── §4.1 + §4.2: mend_clothes availability gates ────────────────────────────

describe('#1193 — mend_clothes availability', () => {
  it('unavailable when sewing_kit absent', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 0 },
      resources: { ...newGame().resources, clothingCondition: 50 }
    });
    const result = CAMP_ACTIONS_BY_ID.mend_clothes.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/sewing kit/i);
  });

  it('unavailable when clothingCondition >= 85', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 85 }
    });
    const result = CAMP_ACTIONS_BY_ID.mend_clothes.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/good shape|85/i);
  });

  it('available when sewing_kit present AND clothingCondition < 85', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 60 }
    });
    const result = CAMP_ACTIONS_BY_ID.mend_clothes.availability(s);
    expect(result.available).toBe(true);
  });

  it('available at condition 84 (boundary just below threshold)', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 84 }
    });
    expect(CAMP_ACTIONS_BY_ID.mend_clothes.availability(s).available).toBe(true);
  });
});

// ─── §4.2: mend_clothes apply effect ─────────────────────────────────────────

describe('#1193 — mend_clothes apply', () => {
  it('restores +18 garment condition (capped at 100)', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 60 }
    });
    const after = CAMP_ACTIONS_BY_ID.mend_clothes.apply(s, makeRng('mend'));
    expect(after.resources.clothingCondition).toBe(78);
  });

  it('caps at 100 when close to full', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 84 }
    });
    const after = CAMP_ACTIONS_BY_ID.mend_clothes.apply(s, makeRng('mend-cap'));
    // 84 + 18 = 102, capped at 100
    expect(after.resources.clothingCondition).toBe(100);
  });

  it('does NOT consume the sewing_kit (durable)', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 2 },
      resources: { ...newGame().resources, clothingCondition: 50 }
    });
    const after = CAMP_ACTIONS_BY_ID.mend_clothes.apply(s, makeRng('mend-kit'));
    expect(after.inventory.sewing_kit).toBe(2);
  });

  it('does NOT change footwear condition', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 50, footwearCondition: 40 }
    });
    const after = CAMP_ACTIONS_BY_ID.mend_clothes.apply(s, makeRng('mend-fw'));
    expect(after.resources.footwearCondition).toBe(40);
  });

  it('logs a mending line', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 50 }
    });
    const logsBefore = s.eventLog.length;
    const after = CAMP_ACTIONS_BY_ID.mend_clothes.apply(s, makeRng('mend-log'));
    expect(after.eventLog.length).toBeGreaterThan(logsBefore);
    const lastLine = after.eventLog[after.eventLog.length - 1].text;
    expect(lastLine).toMatch(/mending|needles|patches/i);
  });
});

// ─── §4.3: stitch_moccasins extension ────────────────────────────────────────

describe('#1072 — stitch_moccasins extends to restore footwear +10', () => {
  it('adds +1 moccasin as before (old behavior preserved)', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, raw_hide: 2, moccasins: 0 },
      resources: { ...newGame().resources, footwearCondition: 50 }
    });
    const after = CAMP_ACTIONS_BY_ID.stitch_moccasins.apply(s, makeRng('stitch-mocc'));
    expect(after.inventory.moccasins).toBe(1);
    expect(after.inventory.raw_hide).toBe(1); // consumed 1
  });

  it('also restores footwearCondition +10', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, raw_hide: 1 },
      resources: { ...newGame().resources, footwearCondition: 50 }
    });
    const after = CAMP_ACTIONS_BY_ID.stitch_moccasins.apply(s, makeRng('stitch-fw'));
    expect(after.resources.footwearCondition).toBe(60);
  });

  it('footwear restore caps at 100', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, raw_hide: 1 },
      resources: { ...newGame().resources, footwearCondition: 95 }
    });
    const after = CAMP_ACTIONS_BY_ID.stitch_moccasins.apply(s, makeRng('stitch-cap'));
    expect(after.resources.footwearCondition).toBe(100);
  });

  it('garment condition unchanged after stitch_moccasins', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, raw_hide: 1 },
      resources: { ...newGame().resources, clothingCondition: 60 }
    });
    const after = CAMP_ACTIONS_BY_ID.stitch_moccasins.apply(s, makeRng('stitch-gar'));
    expect(after.resources.clothingCondition).toBe(60);
  });
});

// ─── §4.4: settleTrade purchase bumps ────────────────────────────────────────

describe('#1072 — settleTrade purchase bumps clothing condition', () => {
  it('buying boots bumps footwearCondition +25 per unit', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, clothingCondition: 80, footwearCondition: 50 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { boots: 1 },
      give: {}
    });
    expect(after.resources.footwearCondition).toBe(75); // 50 + 25
  });

  it('buying two boots bumps footwear +50 (2×25, capped at 100)', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, footwearCondition: 60 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { boots: 2 },
      give: {}
    });
    expect(after.resources.footwearCondition).toBe(100); // 60 + 50 capped
  });

  it('buying moccasins bumps footwearCondition +15 per unit', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, footwearCondition: 50 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { moccasins: 1 },
      give: {}
    });
    expect(after.resources.footwearCondition).toBe(65); // 50 + 15
  });

  it('buying a coat (clothing category) bumps garmentCondition +6', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, clothingCondition: 70, footwearCondition: 80 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { coat: 1 },
      give: {}
    });
    expect(after.resources.clothingCondition).toBe(76); // 70 + 6
    // footwear unchanged
    expect(after.resources.footwearCondition).toBe(80);
  });

  it('buying two coats bumps garments +12 (2×6)', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, clothingCondition: 70 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { coat: 2 },
      give: {}
    });
    expect(after.resources.clothingCondition).toBe(82); // 70 + 12
  });

  it('garment bump caps at 100', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, clothingCondition: 98 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { coat: 1 },
      give: {}
    });
    expect(after.resources.clothingCondition).toBe(100);
  });

  it('buying non-clothing items (flour) does NOT bump either condition', () => {
    const s = atLaramie({
      resources: { ...atLaramie().resources, clothingCondition: 70, footwearCondition: 60 }
    });
    const { state: after } = settleTrade(s, {
      mode: 'cash',
      get: { flour: 10 },
      give: {}
    });
    expect(after.resources.clothingCondition).toBe(70);
    expect(after.resources.footwearCondition).toBe(60);
  });
});

// ─── §4.5: wash_clothes clears damp flag ─────────────────────────────────────

describe('#1072 — wash_clothes clears _clothingDampSinceDay', () => {
  it('clears the damp flag when washing at a river', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'river' },
      flags: { ...newGame().flags, _clothingDampSinceDay: 5 }
    });
    const after = CAMP_ACTIONS_BY_ID.wash_clothes.apply(s, makeRng('wash'));
    expect(after.flags._clothingDampSinceDay).toBeUndefined();
  });

  it('works without the damp flag set (no error)', () => {
    const s = newGame({
      location: { ...newGame().location, terrain: 'river' }
    });
    expect(() => CAMP_ACTIONS_BY_ID.wash_clothes.apply(s, makeRng('wash-no-damp'))).not.toThrow();
    const after = CAMP_ACTIONS_BY_ID.wash_clothes.apply(s, makeRng('wash-no-damp2'));
    expect(after.flags._clothingDampSinceDay).toBeUndefined();
  });
});

// ─── §5: bundle urgency for mend_clothes ─────────────────────────────────────

describe('#1072 §5 — mend_clothes bundle urgency', () => {
  it('urgency 0 when no sewing_kit', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 0 },
      resources: { ...newGame().resources, clothingCondition: 20 }
    });
    expect(urgency(s, 'mend_clothes')).toBe(0);
  });

  it('urgency 0 when clothingCondition >= 85 (mend unavailable)', () => {
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1 },
      resources: { ...newGame().resources, clothingCondition: 90 }
    });
    expect(urgency(s, 'mend_clothes')).toBe(0);
  });

  it('urgency rises as condition drops: 50-84 band = 4, <50 = 7', () => {
    const base = newGame({ inventory: { ...newGame().inventory, sewing_kit: 1 } });

    const s84 = { ...base, resources: { ...base.resources, clothingCondition: 84 } };
    const s50 = { ...base, resources: { ...base.resources, clothingCondition: 50 } };
    const s49 = { ...base, resources: { ...base.resources, clothingCondition: 49 } };
    const s24 = { ...base, resources: { ...base.resources, clothingCondition: 24 } };

    expect(urgency(s84, 'mend_clothes')).toBe(4);
    expect(urgency(s50, 'mend_clothes')).toBe(4); // 50 is in the <85 band
    expect(urgency(s49, 'mend_clothes')).toBe(7); // below 50
    expect(urgency(s24, 'mend_clothes')).toBe(10); // below 25 = critical
  });

  it('mend_clothes urgency is higher than stitch_moccasins when clothing is critical', () => {
    // At critical clothing, mend is more urgent than stitch.
    const s = newGame({
      inventory: { ...newGame().inventory, sewing_kit: 1, raw_hide: 1 },
      resources: { ...newGame().resources, clothingCondition: 20, footwearCondition: 30 }
    });
    expect(urgency(s, 'mend_clothes')).toBeGreaterThan(urgency(s, 'stitch_moccasins'));
  });
});

// ─── §5: equipment slice boots / moccasins / sewing_kit ──────────────────────

describe('#1072 §5 — pickEquipmentRestock clothing/footwear additions', () => {
  function makeInput(inv: Record<string, number>, stockItems: string[]): ShoppingInput {
    return {
      wagon: {
        party: [{ id: 'p0', name: 'Test', sex: 'male', kind: 'adult', isLeader: true, profession: 'farmer', age: 32, health: 100, cleanliness: 100, conditions: [], dead: false }],
        inventory: inv,
        oxen: [],
        morale: 60,
        cash: 300,
        wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 2000, impairment: null }
      } as ShoppingInput['wagon'],
      stock: new Set(stockItems)
    };
  }

  it('adds boots when footwearCondition < 40 and boots in stock', () => {
    const input = makeInput({ boots: 0 }, ['boots', 'moccasins']);
    const buys = pickEquipmentRestock(input, { footwearCondition: 30 });
    expect(buys.some(b => b.item === 'boots')).toBe(true);
  });

  it('adds moccasins as fallback when boots unavailable but footwear < 40', () => {
    const input = makeInput({}, ['moccasins']);
    const buys = pickEquipmentRestock(input, { footwearCondition: 20 });
    expect(buys.some(b => b.item === 'moccasins')).toBe(true);
    expect(buys.some(b => b.item === 'boots')).toBe(false);
  });

  it('skips boots/moccasins when footwearCondition >= 40', () => {
    const input = makeInput({}, ['boots', 'moccasins']);
    const buys = pickEquipmentRestock(input, { footwearCondition: 40 });
    expect(buys.some(b => b.item === 'boots')).toBe(false);
    expect(buys.some(b => b.item === 'moccasins')).toBe(false);
  });

  it('skips boots/moccasins when footwearCondition defaults to 100 (opt absent)', () => {
    const input = makeInput({}, ['boots', 'moccasins']);
    const buys = pickEquipmentRestock(input); // no footwearCondition
    expect(buys.some(b => b.item === 'boots')).toBe(false);
  });

  it('adds sewing_kit when absent and post stocks it', () => {
    const input = makeInput({ sewing_kit: 0 }, ['sewing_kit']);
    const buys = pickEquipmentRestock(input);
    expect(buys.some(b => b.item === 'sewing_kit')).toBe(true);
  });

  it('skips sewing_kit when already owned', () => {
    const input = makeInput({ sewing_kit: 1 }, ['sewing_kit']);
    const buys = pickEquipmentRestock(input);
    expect(buys.some(b => b.item === 'sewing_kit')).toBe(false);
  });

  it('skips sewing_kit when post does not stock it', () => {
    const input = makeInput({ sewing_kit: 0 }, ['shovel', 'cookware']);
    const buys = pickEquipmentRestock(input);
    expect(buys.some(b => b.item === 'sewing_kit')).toBe(false);
  });
});
