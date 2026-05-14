// #915 — Persona pickBarterDispositions invariants.
//
// Verifies that each persona's barter behavior matches its archetype:
//   - cautious: trades hides/robes; food only when surplus deep
//   - balanced: default behavior (no character flavor)
//   - aggressive: only barters when broke; tight rate threshold
//   - hoarder: refuses staples (flour/beans/saleratus/etc.)
//   - drinker: pushes whiskey for staples
//   - chaos: rng-picks one candidate per visit

import { describe, it, expect } from 'vitest';
import {
  cautiousPersona,
  balancedPersona,
  aggressivePersona,
  hoarderPersona,
  drinkerPersona,
  chaosPersona,
  sundayResterPersona,
  generousPersona,
  faithfulPersona,
  pacePusherPersona
} from '../src/lib/game/ai';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

/** Base state for barter persona tests. Medicine zeroed out so the
 *  receive-side `need` predicates fire and dispositions actually
 *  surface; otherwise the bot decides it doesn't want anything. */
function game(): GameState {
  const s = createInitialState({
    seed: 'barter-persona',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    ...s,
    inventory: {
      ...s.inventory,
      quinine: 0,
      calomel: 0,
      laudanum: 0,
      bandages: 0
    } as Record<string, number>
  };
}

const FT_HALL = getLandmark('ft_hall');

describe('#915 — cautious pickBarterDispositions', () => {
  it('offers robes/hides for medicine', () => {
    const s: GameState = { ...game(), inventory: { ...game().inventory, buffalo_robe: 3, quinine: 0 } as Record<string, number> };
    const d = cautiousPersona.pickBarterDispositions(s, FT_HALL, makeRng('t'));
    expect(d.length).toBeGreaterThan(0);
    expect(d.find((x) => x.give.item === 'buffalo_robe')).toBeDefined();
  });

  it('holds deep food reserve — only offers food above 300 lb on hand', () => {
    // Default starter has ~300+ lb food (flour 300 + beans 50 + bacon 30).
    // Cautious threshold is 300, so the default kit usually qualifies —
    // confirm the threshold gates rather than the absolute output.
    const lowS: GameState = { ...game(), inventory: { ...game().inventory, flour: 10, beans: 0, bacon: 0, game_meat: 5 } as Record<string, number> };
    const d = cautiousPersona.pickBarterDispositions(lowS, FT_HALL, makeRng('t'));
    // With food < 300 lb, no game_meat / jerky / pemmican offers.
    expect(d.find((x) => x.give.item === 'game_meat')).toBeUndefined();
    expect(d.find((x) => x.give.item === 'jerky')).toBeUndefined();
  });
});

describe('#915 — aggressive pickBarterDispositions', () => {
  it('returns [] when cash >= $30', () => {
    const s: GameState = { ...game(), cash: 100 };
    expect(aggressivePersona.pickBarterDispositions(s, FT_HALL, makeRng('t'))).toEqual([]);
  });

  it('returns dispositions when cash < $30', () => {
    const s: GameState = {
      ...game(),
      cash: 10,
      inventory: { ...game().inventory, buffalo_robe: 2 } as Record<string, number>
    };
    const d = aggressivePersona.pickBarterDispositions(s, FT_HALL, makeRng('t'));
    expect(d.length).toBeGreaterThan(0);
  });
});

describe('#915 — hoarder pickBarterDispositions', () => {
  it('never offers flour / beans / saleratus', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, flour: 500, beans: 200, saleratus: 20, buffalo_robe: 1 } as Record<string, number>
    };
    const d = hoarderPersona.pickBarterDispositions(s, FT_HALL, makeRng('t'));
    for (const dx of d) {
      expect(dx.give.item).not.toBe('flour');
      expect(dx.give.item).not.toBe('beans');
      expect(dx.give.item).not.toBe('saleratus');
    }
  });

  it('still offers hides/robes (luxury surplus is fine to stockpile only so far)', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, buffalo_robe: 3, raw_hide: 4 } as Record<string, number>
    };
    const d = hoarderPersona.pickBarterDispositions(s, FT_HALL, makeRng('t'));
    expect(d.find((x) => x.give.item === 'buffalo_robe' || x.give.item === 'raw_hide')).toBeDefined();
  });
});

describe('#915 — drinker pickBarterDispositions', () => {
  it('always pushes whiskey when available + post stocks staples', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, whiskey: 5, buffalo_robe: 1 } as Record<string, number>
    };
    const d = drinkerPersona.pickBarterDispositions(s, FT_HALL, makeRng('t'));
    expect(d.find((x) => x.give.item === 'whiskey')).toBeDefined();
  });

  it('no whiskey in inventory → no whiskey offer', () => {
    const s: GameState = { ...game(), inventory: { ...game().inventory, buffalo_robe: 1 } as Record<string, number> };
    const d = drinkerPersona.pickBarterDispositions(s, FT_HALL, makeRng('t'));
    expect(d.find((x) => x.give.item === 'whiskey')).toBeUndefined();
  });
});

describe('#915 — chaos pickBarterDispositions', () => {
  it('picks at most one disposition per visit (fuzz coverage)', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, buffalo_robe: 3, raw_hide: 2, game_meat: 50, jerky: 50, pemmican: 30 } as Record<string, number>
    };
    for (let i = 0; i < 10; i++) {
      const d = chaosPersona.pickBarterDispositions(s, FT_HALL, makeRng(`c${i}`));
      expect(d.length).toBeLessThanOrEqual(1);
    }
  });

  it('different seeds may pick different dispositions (chaos is fuzz)', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, buffalo_robe: 3, raw_hide: 2 } as Record<string, number>
    };
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = chaosPersona.pickBarterDispositions(s, FT_HALL, makeRng(`c${i}`));
      if (d.length > 0) seen.add(`${d[0].give.item}-${d[0].receive.item}`);
    }
    // Across 30 seeds chaos should explore at least 2 distinct cells.
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('#915 — every persona honors barterEnabled = false', () => {
  const disabledPost = { ...FT_HALL, barterEnabled: false };
  const personas = [
    cautiousPersona, balancedPersona, aggressivePersona, chaosPersona,
    sundayResterPersona, pacePusherPersona, hoarderPersona,
    generousPersona, faithfulPersona, drinkerPersona
  ];
  for (const p of personas) {
    it(`${p.id} returns [] at a barterEnabled:false post`, () => {
      const s: GameState = {
        ...game(),
        cash: 5,  // ensure aggressive's cash gate doesn't pre-empty
        inventory: { ...game().inventory, buffalo_robe: 3, whiskey: 3 } as Record<string, number>
      };
      expect(p.pickBarterDispositions(s, disabledPost, makeRng('t'))).toEqual([]);
    });
  }
});
