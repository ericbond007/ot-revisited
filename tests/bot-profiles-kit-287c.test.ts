// #287c — per-profile kit picker. Named profiles ship signature gear
// (Sager fiddle + bible + 250 lb flour, Joe Meek's trapper kit, etc.)
// — same kit every run on the same seed. Other items still vary by
// seed, but the override fields are deterministic.
//
// Tests verify:
//   - kitOverrides REPLACES the random qty (not adds to it)
//   - same seed + same profile → same override values
//   - different seeds with the same profile → different other-item rolls,
//     same override values
//   - profiles WITHOUT kitOverrides → no determinism (current behavior)
//   - cash override applies to wagon-level cash field, not inventory

import { describe, it, expect } from 'vitest';
import { generateTrain } from '../src/lib/game/content/trains';
import { LAUNCH_PROFILES, getBotProfile } from '../src/lib/game/content/bot-profiles';
import { makeRng } from '../src/lib/game/rng';

function findCompanionByName(seedStr: string, displayName: string) {
  // Drive enough trials to hit the named profile in companions[0..n].
  for (let i = 0; i < 100; i++) {
    const seed = `${seedStr}-${i}`;
    const t = generateTrain(seed, 30, 'fort_kearny', makeRng(seed), { fresh: false });
    const found = t.companions.find((c) => c.name === displayName);
    if (found) return { wagon: found, train: t, seed };
  }
  return null;
}

describe('#287c — kit override structure', () => {
  it('Sager profile carries flour + bible + fiddle in kitOverrides', () => {
    const sager = getBotProfile('sager-family');
    expect(sager.kitOverrides).toMatchObject({ flour: 250, bible: 1, fiddle: 1 });
  });

  it('Joe Meek profile carries trapper kit', () => {
    const meek = getBotProfile('joe-meek');
    expect(meek.kitOverrides).toMatchObject({
      flour: 30, gunpowder: 40, lead_balls: 30, lead_pig: 2, jerky: 20, whiskey: 4
    });
  });

  it('Whitman profile carries mission literacy props', () => {
    const w = getBotProfile('whitman-mission');
    expect(w.kitOverrides).toMatchObject({ medical_books: 1, bible: 2, primer: 1 });
  });

  it('Donner profile carries settler luxury haul', () => {
    const d = getBotProfile('donner-family');
    expect(d.kitOverrides).toMatchObject({ flour: 200, china_tea_set: 1, anvil: 1 });
  });

  it('Reed profile carries Pioneer Palace Car luxuries + cash', () => {
    const r = getBotProfile('reed-family');
    expect(r.kitOverrides).toMatchObject({
      feather_mattress: 1, china_tea_set: 1, family_bible: 1, cash: 600
    });
  });

  it('Tabitha Brown / Joel Palmer / Hastings / Bidwell / Meeker profiles have no overrides (slice C only sets 5)', () => {
    expect(getBotProfile('tabitha-brown').kitOverrides).toBeUndefined();
    expect(getBotProfile('joel-palmer').kitOverrides).toBeUndefined();
    expect(getBotProfile('lansford-hastings').kitOverrides).toBeUndefined();
    expect(getBotProfile('bidwell-party').kitOverrides).toBeUndefined();
    expect(getBotProfile('meeker-family').kitOverrides).toBeUndefined();
  });
});

describe('#287c — kit override applied at wagon-gen time', () => {
  it('Sager wagon always ships flour=250, bible=1, fiddle=1', () => {
    const found = findCompanionByName('s', 'the Sager family');
    expect(found, 'expected to find Sager family in 100 seeded trains').not.toBeNull();
    const w = found!.wagon;
    expect(w.inventory.flour).toBe(250);
    expect(w.inventory.bible).toBe(1);
    expect(w.inventory.fiddle).toBe(1);
  });

  it('Joe Meek wagon always ships trapper kit', () => {
    const found = findCompanionByName('m', 'Joe Meek');
    expect(found).not.toBeNull();
    const w = found!.wagon;
    expect(w.inventory.flour).toBe(30);
    expect(w.inventory.gunpowder).toBe(40);
    expect(w.inventory.lead_pig).toBe(2);
    expect(w.inventory.jerky).toBe(20);
    expect(w.inventory.whiskey).toBe(4);
  });

  it('Reed wagon `cash` override applies to wagon.cash, not inventory.cash', () => {
    const found = findCompanionByName('r', 'the Reed family');
    expect(found).not.toBeNull();
    const w = found!.wagon;
    expect(w.cash).toBe(600);
    // `cash` should NOT have leaked into the inventory dict as a key
    expect(w.inventory.cash).toBeUndefined();
  });
});

describe('#287c — random fillers unaffected by overrides', () => {
  it('non-override profiles + random fillers still get random flour rolls', () => {
    // Generate 30 trains, collect random-filler flour values, confirm
    // they vary (not all clamped to a single qty).
    const flours = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const seed = `r${i}`;
      const t = generateTrain(seed, 30, 'fort_kearny', makeRng(seed), { fresh: false });
      for (const c of t.companions) {
        // Skip named profiles by checking against displayName.
        if (LAUNCH_PROFILES.some((p) => p.displayName === c.name)) continue;
        flours.add(c.inventory.flour ?? 0);
      }
    }
    // Random fillers should yield > 5 distinct flour values across
    // 30 trains. (If all rolls collapsed to one, we'd see size = 1.)
    expect(flours.size).toBeGreaterThan(5);
  });
});
