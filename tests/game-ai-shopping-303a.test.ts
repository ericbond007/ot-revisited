// #303a Shopping decision-layer tests. Each slice tested in isolation
// against a stub WagonStateLike so the same fixtures cover player +
// future NPC consumers (#299).

import { describe, it, expect } from 'vitest';
import {
  pickWarmthRestock,
  pickEquipmentRestock,
  pickFoodRestock,
  pickHunterRestock,
  pickRepairRestock,
  pickMedicineRestock,
  composeShoppingList,
  missingSurvivalGear,
  type ShoppingInput
} from '../src/lib/game/ai';
import type { WagonStateLike, PartyMember, Ox } from '../src/lib/game/types';
import { DEFAULT_WAGON_MODEL, getWagon } from '../src/lib/game/content/wagons';

function adult(over: Partial<PartyMember> = {}): PartyMember {
  return {
    id: 'm1',
    name: 'M',
    sex: 'male',
    kind: 'adult',
    isLeader: true,
    age: 30,
    health: 100,
    conditions: [],
    dead: false,
    ...over
  };
}

function ox(id: string): Ox {
  return { id, health: 100, fatigue: 0, shod: true };
}

function wagon(over: Partial<WagonStateLike> = {}): WagonStateLike {
  const model = getWagon(DEFAULT_WAGON_MODEL);
  return {
    party: [adult()],
    inventory: {},
    oxen: [ox('o1'), ox('o2')],
    morale: 70,
    cash: 100,
    wagon: {
      model: DEFAULT_WAGON_MODEL,
      condition: 100,
      canvas: 100,
      carryCapacity: model.carryCapacity
    },
    ...over
  };
}

function input(over: Partial<WagonStateLike> = {}, stockItems: string[] = []): ShoppingInput {
  return { wagon: wagon(over), stock: new Set(stockItems) };
}

describe('#303a — pickWarmthRestock', () => {
  it('buys coats / blankets per alive person', () => {
    const buys = pickWarmthRestock(input({}, ['coat', 'blanket', 'tent', 'boots']));
    expect(buys).toContainEqual({ item: 'coat', qty: 1 });
    expect(buys).toContainEqual({ item: 'blanket', qty: 1 });
    expect(buys).toContainEqual({ item: 'tent', qty: 1 });
    expect(buys).toContainEqual({ item: 'boots', qty: 1 });
  });

  it('skips items the post does not stock', () => {
    const buys = pickWarmthRestock(input({}, ['coat']));
    expect(buys).toEqual([{ item: 'coat', qty: 1 }]);
  });

  it('only buys the gap, not the full count', () => {
    const buys = pickWarmthRestock(
      input({ inventory: { coat: 1 }, party: [adult(), adult({ id: 'm2' }), adult({ id: 'm3' })] }, ['coat'])
    );
    expect(buys).toEqual([{ item: 'coat', qty: 2 }]);
  });

  it('skips when fully stocked', () => {
    const buys = pickWarmthRestock(input({ inventory: { coat: 5 } }, ['coat']));
    expect(buys).toEqual([]);
  });
});

describe('#303a — pickEquipmentRestock', () => {
  it('buys missing utility items', () => {
    const buys = pickEquipmentRestock(input({}, ['shovel', 'cookware', 'water_skin', 'rope']));
    expect(buys).toContainEqual({ item: 'shovel', qty: 1 });
    expect(buys).toContainEqual({ item: 'cookware', qty: 1 });
    expect(buys).toContainEqual({ item: 'water_skin', qty: 1 });
    expect(buys).toContainEqual({ item: 'rope', qty: 1 });
  });

  it('water_skin threshold is 2', () => {
    expect(pickEquipmentRestock(input({ inventory: { water_skin: 1 } }, ['water_skin']))).toEqual([
      { item: 'water_skin', qty: 1 }
    ]);
    expect(pickEquipmentRestock(input({ inventory: { water_skin: 2 } }, ['water_skin']))).toEqual([]);
  });
});

describe('#303a — pickFoodRestock (NPC #299 consumer)', () => {
  it('buys flour / bacon / beans / jerky when below thresholds', () => {
    const buys = pickFoodRestock(input({}, ['flour', 'bacon', 'beans', 'jerky']));
    expect(buys).toContainEqual({ item: 'flour', qty: 200 });
    expect(buys).toContainEqual({ item: 'bacon', qty: 60 });
    expect(buys).toContainEqual({ item: 'beans', qty: 40 });
    expect(buys).toContainEqual({ item: 'jerky', qty: 20 });
  });

  it('skips flour at or above 300 lb cap', () => {
    expect(pickFoodRestock(input({ inventory: { flour: 300 } }, ['flour']))).toEqual([]);
    expect(pickFoodRestock(input({ inventory: { flour: 350 } }, ['flour']))).toEqual([]);
  });

  it('does not include hunter ammo or grain (those are pickHunterRestock)', () => {
    const buys = pickFoodRestock(input({}, ['flour', 'gunpowder', 'salt', 'grain']));
    expect(buys.some((b) => b.item === 'gunpowder')).toBe(false);
    expect(buys.some((b) => b.item === 'salt')).toBe(false);
    expect(buys.some((b) => b.item === 'grain')).toBe(false);
  });
});

describe('#303a — pickHunterRestock', () => {
  it('buys grain regardless of profession', () => {
    const buys = pickHunterRestock(input({}, ['grain']));
    expect(buys).toContainEqual({ item: 'grain', qty: 30 });
  });

  it('skips ammo + salt without a Hunter', () => {
    const buys = pickHunterRestock(input({}, ['gunpowder', 'lead_balls', 'percussion_caps', 'salt']));
    expect(buys).toEqual([]);
  });

  it('buys ammo + salt with a live Hunter', () => {
    const hunter: PartyMember = adult({ id: 'h', profession: 'hunter' });
    const buys = pickHunterRestock(
      input({ party: [hunter] }, ['gunpowder', 'lead_balls', 'percussion_caps', 'salt'])
    );
    expect(buys).toContainEqual({ item: 'gunpowder', qty: 30 });
    expect(buys).toContainEqual({ item: 'lead_balls', qty: 30 });
    expect(buys).toContainEqual({ item: 'percussion_caps', qty: 30 });
    expect(buys).toContainEqual({ item: 'salt', qty: 10 });
  });

  it('skips ammo when Hunter is dead', () => {
    const dead: PartyMember = adult({ id: 'h', profession: 'hunter', dead: true });
    const buys = pickHunterRestock(input({ party: [dead] }, ['gunpowder']));
    expect(buys).toEqual([]);
  });
});

describe('#303a — pickRepairRestock', () => {
  it('skips parts without a Blacksmith', () => {
    const buys = pickRepairRestock(input({}, ['axle', 'wheel', 'tongue', 'tar_bucket']));
    expect(buys).toEqual([]);
  });

  it('buys spare parts with a live Blacksmith', () => {
    const smith: PartyMember = adult({ id: 's', profession: 'blacksmith' });
    const buys = pickRepairRestock(
      input({ party: [smith] }, ['axle', 'wheel', 'tongue', 'tar_bucket'])
    );
    expect(buys).toContainEqual({ item: 'axle', qty: 1 });
    expect(buys).toContainEqual({ item: 'wheel', qty: 1 });
    expect(buys).toContainEqual({ item: 'tongue', qty: 1 });
    expect(buys).toContainEqual({ item: 'tar_bucket', qty: 1 });
  });

  it('only buys the gap (already has 1 axle → skip)', () => {
    const smith: PartyMember = adult({ id: 's', profession: 'blacksmith' });
    const buys = pickRepairRestock(
      input({ party: [smith], inventory: { axle: 1 } }, ['axle', 'wheel'])
    );
    expect(buys).toEqual([{ item: 'wheel', qty: 1 }]);
  });
});

describe('#303a — pickMedicineRestock', () => {
  it('buys all 8 drugs when stocked + below threshold', () => {
    const buys = pickMedicineRestock(
      input({}, [
        'quinine', 'bandages', 'laudanum', 'dovers_powder',
        'calomel', 'paregoric', 'epsom_salts', 'dried_fruit'
      ])
    );
    expect(buys).toContainEqual({ item: 'quinine', qty: 4 });
    expect(buys).toContainEqual({ item: 'bandages', qty: 4 });
    expect(buys).toContainEqual({ item: 'laudanum', qty: 3 });
    expect(buys).toContainEqual({ item: 'dovers_powder', qty: 3 });
    expect(buys).toContainEqual({ item: 'calomel', qty: 3 });
    expect(buys).toContainEqual({ item: 'paregoric', qty: 3 });
    expect(buys).toContainEqual({ item: 'epsom_salts', qty: 3 });
    expect(buys).toContainEqual({ item: 'dried_fruit', qty: 5 });
  });

  it('not gated on profession — any wagon can buy meds', () => {
    const farmer: PartyMember = adult({ profession: 'farmer' });
    const buys = pickMedicineRestock(input({ party: [farmer] }, ['quinine']));
    expect(buys).toEqual([{ item: 'quinine', qty: 4 }]);
  });
});

describe('#303a — composeShoppingList', () => {
  it('produces all 6 tiers in order: warmth → equipment → food → hunter → repair → medicine', () => {
    const hunter: PartyMember = adult({ id: 'h', profession: 'hunter' });
    const buys = composeShoppingList(
      input(
        { party: [hunter] },
        ['coat', 'shovel', 'flour', 'gunpowder', 'tar_bucket', 'quinine']
      )
    );
    // Each tier should appear, and they should be in order.
    const items = buys.map((b) => b.item);
    expect(items).toContain('coat');
    expect(items).toContain('shovel');
    expect(items).toContain('flour');
    expect(items).toContain('gunpowder');
    // tar_bucket gated on Blacksmith — not present (hunter only)
    expect(items).not.toContain('tar_bucket');
    expect(items).toContain('quinine');
    // Order check
    expect(items.indexOf('coat')).toBeLessThan(items.indexOf('shovel'));
    expect(items.indexOf('shovel')).toBeLessThan(items.indexOf('flour'));
    expect(items.indexOf('flour')).toBeLessThan(items.indexOf('gunpowder'));
    expect(items.indexOf('gunpowder')).toBeLessThan(items.indexOf('quinine'));
  });

  it('returns empty array when post stocks nothing', () => {
    expect(composeShoppingList(input({}, []))).toEqual([]);
  });
});

describe('#303a — missingSurvivalGear', () => {
  it('returns true when coat short', () => {
    expect(missingSurvivalGear(wagon())).toBe(true);
  });

  it('returns false when coat + blanket + tent stocked', () => {
    expect(missingSurvivalGear(
      wagon({ inventory: { coat: 1, blanket: 1, tent: 1 } })
    )).toBe(false);
  });

  it('scales coat / blanket need with party size', () => {
    const w = wagon({
      party: [adult(), adult({ id: 'm2' })],
      inventory: { coat: 1, blanket: 2, tent: 1 }
    });
    expect(missingSurvivalGear(w)).toBe(true);
  });
});
