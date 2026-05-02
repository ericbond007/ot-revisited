import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';
import { NOON_EVENTS } from '../src/lib/game/content/noon-events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

const TRINKETS = ['mirror', 'vermilion', 'awl', 'thimble', 'calico', 'pocket_knife'] as const;

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'trade-goods-216',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1849, month: 5, day: 1 }
  });
  return { ...s, ...over };
}

describe('#216 trade goods — items + prices', () => {
  it('all 6 trinkets exist as native_trade items', () => {
    for (const id of TRINKETS) {
      expect(ITEMS[id]).toBeDefined();
      expect(ITEMS[id].category).toBe('native_trade');
    }
  });

  it('all 6 trinkets have weights and buy/sell prices', () => {
    for (const id of TRINKETS) {
      expect(ITEMS[id].weightLbPerUnit).toBeGreaterThan(0);
      expect(PRICES[id].buy).toBeGreaterThan(0);
      expect(PRICES[id].sell).toBeGreaterThan(0);
      expect(PRICES[id].sell).toBeLessThan(PRICES[id].buy);
    }
  });

  it('vermilion is the most expensive (period reality)', () => {
    expect(PRICES.vermilion.buy).toBeGreaterThan(PRICES.mirror.buy);
    expect(PRICES.vermilion.buy).toBeGreaterThan(PRICES.awl.buy);
    expect(PRICES.vermilion.buy).toBeGreaterThan(PRICES.thimble.buy);
    expect(PRICES.vermilion.buy).toBeGreaterThan(PRICES.pocket_knife.buy);
  });
});

describe('#216 trade goods — outfitter + post stocking', () => {
  it('all trinkets in OUTFITTER_BUYABLES (Independence)', () => {
    for (const id of TRINKETS) {
      expect(OUTFITTER_BUYABLES).toContain(id);
    }
  });

  function postStock(id: string): readonly string[] {
    return LANDMARKS.find((l) => l.id === id)?.stock ?? [];
  }

  it('Fort Laramie stocks the full Plains-trader pack', () => {
    const stock = postStock('ft_laramie');
    for (const id of TRINKETS) expect(stock).toContain(id);
  });

  it('Fort Bridger (fur-trade post) stocks all trinkets', () => {
    const stock = postStock('ft_bridger');
    for (const id of TRINKETS) expect(stock).toContain(id);
  });

  it('Fort Hall (HBC) stocks the trinket pack', () => {
    const stock = postStock('ft_hall');
    for (const id of TRINKETS) expect(stock).toContain(id);
  });

  it('Robidoux (small mountain post) stocks a partial pack', () => {
    const stock = postStock('robidoux_post');
    expect(stock).toContain('mirror');
    expect(stock).toContain('awl');
    expect(stock).toContain('thimble');
    expect(stock).toContain('pocket_knife');
  });

  it('The Dalles (end-of-trail) does NOT stock trinkets', () => {
    const stock = postStock('the_dalles');
    expect(stock).not.toContain('mirror');
    expect(stock).not.toContain('vermilion');
  });
});

describe('#216 going-back party offers a trade-goods box', () => {
  const ENC = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_going_back_party')!;
  const choice = ENC.choices.find((c) => c.id === 'buy_trade_goods')!;

  it('choice exists', () => {
    expect(choice).toBeDefined();
  });

  it('costs $3 and yields a full trinket pack', () => {
    const before: GameState = { ...newGame(), cash: 50 };
    const after = choice.apply(before, makeRng('go-trade'));
    expect(after.cash).toBe(47);
    expect(after.inventory.mirror).toBe(1);
    expect(after.inventory.vermilion).toBe(1);
    expect(after.inventory.awl).toBe(2);
    expect(after.inventory.thimble).toBe(3);
    expect(after.inventory.calico).toBe(1);
    expect(after.inventory.pocket_knife).toBe(1);
  });

  it('no-ops with a log line when broke', () => {
    const before: GameState = { ...newGame(), cash: 1 };
    const after = choice.apply(before, makeRng('go-broke'));
    expect(after.cash).toBe(1);
    expect(after.inventory.mirror ?? 0).toBe(0);
  });
});

describe('#216 abandoned wagon expanded loot table', () => {
  const ENC = ENCOUNTER_EVENTS.find((e) => e.id === 'encounter_abandoned_wagon')!;
  const scavenge = ENC.choices.find((c) => c.id === 'scavenge')!;

  it('always finds at least 1 plank', () => {
    for (let i = 0; i < 50; i++) {
      const before = newGame();
      const after = scavenge.apply(before, makeRng(`plank-${i}`));
      expect((after.inventory.spare_plank ?? 0)).toBeGreaterThanOrEqual(1);
    }
  });

  it('eventually yields a trinket across many tries', () => {
    let saw = false;
    for (let i = 0; i < 200 && !saw; i++) {
      const after = scavenge.apply(newGame(), makeRng(`trink-${i}`));
      if ((after.inventory.mirror ?? 0) > 0
        || (after.inventory.awl ?? 0) > 0
        || (after.inventory.thimble ?? 0) > 0
        || (after.inventory.pocket_knife ?? 0) > 0) saw = true;
    }
    expect(saw).toBe(true);
  });

  it('eventually yields a comfort item', () => {
    let saw = false;
    for (let i = 0; i < 200 && !saw; i++) {
      const before = newGame();
      const after = scavenge.apply(before, makeRng(`comfort-${i}`));
      if ((after.inventory.bible ?? 0) > (before.inventory.bible ?? 0)
        || (after.inventory.harmonica ?? 0) > (before.inventory.harmonica ?? 0)
        || (after.inventory.whiskey ?? 0) > (before.inventory.whiskey ?? 0)
        || (after.inventory.tobacco ?? 0) > (before.inventory.tobacco ?? 0)
        || (after.inventory.fiddle ?? 0) > (before.inventory.fiddle ?? 0)) saw = true;
    }
    expect(saw).toBe(true);
  });

  it('eventually yields salvageable food', () => {
    let saw = false;
    for (let i = 0; i < 200 && !saw; i++) {
      const before = newGame();
      const after = scavenge.apply(before, makeRng(`food-${i}`));
      if ((after.inventory.flour ?? 0) > (before.inventory.flour ?? 0)
        || (after.inventory.hardtack ?? 0) > (before.inventory.hardtack ?? 0)
        || (after.inventory.dried_fruit ?? 0) > (before.inventory.dried_fruit ?? 0)) saw = true;
    }
    expect(saw).toBe(true);
  });

  it('logs all finds in one line', () => {
    const after = scavenge.apply(newGame(), makeRng('log-1'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/wreck/i);
    expect(last).toMatch(/plank/i);
  });
});

describe('#216 noon trinket-pouch event', () => {
  const ev = NOON_EVENTS.find((e) => e.id === 'noon_trinket_pouch')!;

  it('is registered in the noon pool', () => {
    expect(ev).toBeDefined();
  });

  it('pocket-it always yields at least one thimble', () => {
    const choice = ev.choices.find((c) => c.id === 'pocket_it')!;
    const before = newGame();
    const after = choice.apply(before, makeRng('pouch'));
    expect(after.inventory.thimble ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('leave-it grants +1 morale', () => {
    const choice = ev.choices.find((c) => c.id === 'leave')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('leave-pouch'));
    expect(after.morale).toBe(51);
  });
});
