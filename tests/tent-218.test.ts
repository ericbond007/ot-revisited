import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { OUTFITTER_BUYABLES } from '../src/lib/game/content/outfitter';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { attemptFire } from '../src/lib/game/systems/fire';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'tent-218',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1849, month: 12, day: 1 } // winter ⇒ cold-night active
  });
  return {
    ...s,
    location: { ...s.location, terrain: 'mountains' },
    resources: { ...s.resources, firewood: 0 },
    ...over
  };
}

describe('#218 tent — catalog + pricing', () => {
  it('exists in items.ts', () => {
    expect(ITEMS.tent).toBeDefined();
    expect(ITEMS.tent.name).toBe('Tent');
    expect(ITEMS.tent.weightLbPerUnit).toBeGreaterThan(0);
    expect(ITEMS.tent.category).toBe('clothing');
  });

  it('has a buy/sell price', () => {
    expect(PRICES.tent.buy).toBeGreaterThan(0);
    expect(PRICES.tent.sell).toBeGreaterThan(0);
    expect(PRICES.tent.sell).toBeLessThan(PRICES.tent.buy);
  });

  it('appears in the Independence outfitter list', () => {
    expect(OUTFITTER_BUYABLES).toContain('tent');
  });
});

describe('#218 tent — post stocking', () => {
  function postStock(id: string): readonly string[] {
    return LANDMARKS.find((l) => l.id === id)?.stock ?? [];
  }

  it('stocked at Fort Laramie (major resupply hub)', () => {
    expect(postStock('ft_laramie')).toContain('tent');
  });

  it('stocked at Fort Hall (HBC)', () => {
    expect(postStock('ft_hall')).toContain('tent');
  });

  it('stocked at The Dalles (end-of-trail)', () => {
    expect(postStock('the_dalles')).toContain('tent');
  });

  it('stocked at Fort Kearny (army quartermaster)', () => {
    expect(postStock('ft_kearny')).toContain('tent');
  });

  it('NOT stocked at Hollenberg (small road ranch)', () => {
    expect(postStock('hollenberg_ranch')).not.toContain('tent');
  });

  it('NOT stocked at Bridger (famously sparse mountain post)', () => {
    expect(postStock('ft_bridger')).not.toContain('tent');
  });
});

describe('#218 tent — cold-camp morale mitigation', () => {
  it('halves the morale hit on a no-fire night', () => {
    const baseline: GameState = { ...newGame(), morale: 50 };
    const without = attemptFire(baseline, makeRng('cold-no-tent'));

    const withTent: GameState = {
      ...baseline,
      inventory: { ...baseline.inventory, tent: 1 }
    };
    const tented = attemptFire(withTent, makeRng('cold-tent'));

    const withoutDrop = baseline.morale - without.morale;
    const tentedDrop = baseline.morale - tented.morale;

    expect(tentedDrop).toBeLessThan(withoutDrop);
    // Specifically: 2 → 1.
    expect(withoutDrop).toBe(2);
    expect(tentedDrop).toBe(1);
  });

  it('does not apply when there is fire on hand (no cold-camp event)', () => {
    const lit: GameState = {
      ...newGame(),
      morale: 50,
      resources: { ...newGame().resources, firewood: 100 },
      inventory: { ...newGame().inventory, tent: 1 }
    };
    const after = attemptFire(lit, makeRng('lit'));
    expect(after.morale).toBe(50); // No penalty applied — fire lit normally.
  });

  it('multiple tents do not stack — single mitigation is enough', () => {
    const oneTent: GameState = {
      ...newGame(),
      morale: 50,
      inventory: { ...newGame().inventory, tent: 1 }
    };
    const fiveTents: GameState = {
      ...newGame(),
      morale: 50,
      inventory: { ...newGame().inventory, tent: 5 }
    };
    expect(attemptFire(oneTent, makeRng('1')).morale)
      .toBe(attemptFire(fiveTents, makeRng('1')).morale);
  });
});

describe('#218 tent — health hit unchanged', () => {
  it('the health hit on cold mountain nights is unaffected by tent', () => {
    const baseline = newGame();
    const without = attemptFire(baseline, makeRng('h-no-tent'));
    const tented = attemptFire({
      ...baseline,
      inventory: { ...baseline.inventory, tent: 1 }
    }, makeRng('h-tent'));
    // Compare any one alive member's HP delta — clothing handles cold; tent is morale.
    const baseHp = baseline.party[0].health;
    expect(without.party[0].health).toBeLessThan(baseHp);
    expect(tented.party[0].health).toBe(without.party[0].health);
  });
});
