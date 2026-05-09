// #909 — wire shouldBuyCookwareSpare + shouldBuySaleratus dispositions
// into shopping.ts via two new persona-method opts:
//   pickFoodRestockOpts.saleratusOverstock (folded INTO existing method)
//   pickEquipmentRestockOpts.cookwareSpare (new method)
// Cautious / hoarder-as-stockpiler enable both; everyone else inherits
// balanced (no overstock, no spare).

import { describe, it, expect } from 'vitest';
import {
  cautiousPersona,
  balancedPersona,
  aggressivePersona,
  hoarderPersona,
  generousPersona,
  faithfulPersona,
  drinkerPersona,
  pacePusherPersona,
  sundayResterPersona,
  chaosPersona
} from '../src/lib/game/ai';
import {
  pickEquipmentRestock,
  pickFoodRestock
} from '../src/lib/game/ai/shopping';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'r909',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, ...over };
}

const COOKWARE_STOCKED = new Set(['cookware', 'flour', 'bacon', 'beans', 'saleratus']);

describe('#909 — pickEquipmentRestockOpts.cookwareSpare', () => {
  it('cautious wants a spare cookware (Tabitha Brown disposition)', () => {
    expect(cautiousPersona.pickEquipmentRestockOpts(game())).toEqual({ cookwareSpare: true });
  });

  it('hoarder wants a spare cookware (supply-stockpiler disposition per #909)', () => {
    expect(hoarderPersona.pickEquipmentRestockOpts(game())).toEqual({ cookwareSpare: true });
  });

  it('balanced and balanced-inheritors do not stock a spare', () => {
    expect(balancedPersona.pickEquipmentRestockOpts(game())).toEqual({});
    expect(generousPersona.pickEquipmentRestockOpts(game())).toEqual({});
    expect(faithfulPersona.pickEquipmentRestockOpts(game())).toEqual({});
    expect(drinkerPersona.pickEquipmentRestockOpts(game())).toEqual({});
    expect(pacePusherPersona.pickEquipmentRestockOpts(game())).toEqual({});
    expect(sundayResterPersona.pickEquipmentRestockOpts(game())).toEqual({});
  });

  it('aggressive packs lean — no spare', () => {
    expect(aggressivePersona.pickEquipmentRestockOpts(game())).toEqual({});
  });

  it('chaos cycles cookwareSpare deterministically by state.day', () => {
    const s0 = { ...game(), day: 3 }; // 3 % 3 === 0 → true
    const s1 = { ...game(), day: 4 }; // 4 % 3 === 1 → false
    expect(chaosPersona.pickEquipmentRestockOpts(s0)).toEqual({ cookwareSpare: true });
    expect(chaosPersona.pickEquipmentRestockOpts(s1)).toEqual({ cookwareSpare: false });
  });
});

describe('#909 — pickEquipmentRestock honors cookwareSpare', () => {
  it('default (no opts) keeps the count<1 contract — buys 1 when wagon has 0', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 0 } };
    const buys = pickEquipmentRestock({ wagon: s, stock: COOKWARE_STOCKED });
    expect(buys.find((b) => b.item === 'cookware')?.qty).toBe(1);
  });

  it('default (no opts) skips cookware when wagon already has 1', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 1 } };
    const buys = pickEquipmentRestock({ wagon: s, stock: COOKWARE_STOCKED });
    expect(buys.find((b) => b.item === 'cookware')).toBeUndefined();
  });

  it('cookwareSpare=true buys 1 more when wagon has 1 (target 2)', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 1 } };
    const buys = pickEquipmentRestock({ wagon: s, stock: COOKWARE_STOCKED }, { cookwareSpare: true });
    expect(buys.find((b) => b.item === 'cookware')?.qty).toBe(1);
  });

  it('cookwareSpare=true buys 2 when wagon has 0 (target 2)', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 0 } };
    const buys = pickEquipmentRestock({ wagon: s, stock: COOKWARE_STOCKED }, { cookwareSpare: true });
    expect(buys.find((b) => b.item === 'cookware')?.qty).toBe(2);
  });

  it('cookwareSpare=true skips when wagon already has 2', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 2 } };
    const buys = pickEquipmentRestock({ wagon: s, stock: COOKWARE_STOCKED }, { cookwareSpare: true });
    expect(buys.find((b) => b.item === 'cookware')).toBeUndefined();
  });
});

describe('#909 — pickFoodRestock honors saleratusOverstock', () => {
  it('default (no overstock) treats saleratus on the daysFloor like every other food', () => {
    // saleratus=0 → below any daysFloor → triggers buy.
    const s = { ...game(), inventory: { ...game().inventory, saleratus: 0 } };
    const buys = pickFoodRestock({ wagon: s, stock: COOKWARE_STOCKED }, { daysFloor: 30, daysCap: 90 });
    const sal = buys.find((b) => b.item === 'saleratus');
    expect(sal?.qty ?? 0).toBeGreaterThan(0);
  });

  it('saleratusOverstock=true triggers a buy even when above the daysFloor', () => {
    // 2 eaters, rate=0.015 lb/day → daysFloor=30 → floor ~1 lb;
    // daysCap=90 → cap ~3 lb. Inventory at 2 lb sits above floor
    // (no buy under default) but below cap (overstock buys).
    const inv = { ...game().inventory, saleratus: 2 };
    const baseline = pickFoodRestock(
      { wagon: { ...game(), inventory: inv }, stock: COOKWARE_STOCKED },
      { daysFloor: 30, daysCap: 90 }
    );
    const overstock = pickFoodRestock(
      { wagon: { ...game(), inventory: inv }, stock: COOKWARE_STOCKED },
      { daysFloor: 30, daysCap: 90, saleratusOverstock: true }
    );
    // Default skips (above floor); overstock triggers a buy to cap.
    expect(baseline.find((b) => b.item === 'saleratus')).toBeUndefined();
    expect(overstock.find((b) => b.item === 'saleratus')?.qty ?? 0).toBeGreaterThan(0);
  });

  it('cautious pickFoodRestockOpts emits saleratusOverstock=true', () => {
    const opts = cautiousPersona.pickFoodRestockOpts(game());
    expect(opts.saleratusOverstock).toBe(true);
  });

  it('hoarder pickFoodRestockOpts emits saleratusOverstock=true (#909 stockpiler)', () => {
    const opts = hoarderPersona.pickFoodRestockOpts(game());
    expect(opts.saleratusOverstock).toBe(true);
  });

  it('balanced and aggressive do not emit saleratusOverstock', () => {
    expect(balancedPersona.pickFoodRestockOpts(game()).saleratusOverstock).toBeUndefined();
    expect(aggressivePersona.pickFoodRestockOpts(game()).saleratusOverstock).toBeUndefined();
  });
});
