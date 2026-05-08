// #287c → updated for #888a — per-profile complete kit.
//
// Pre-#888a: `kitOverrides` was a partial replacement on a random
// base. Post-#888a: `kit` IS the complete Layer-0 inventory for the
// NPC wagon (no random base layer). Profession.starterGear still
// layers additively on top.
//
// Tests verify:
//   - profile.kit shape (signature items present in each of the 5
//     curated kits; the other 5 profiles still have undefined kit)
//   - generated NPC wagon inventory matches profile.kit + profession
//     starterGear (additive)
//   - cash applies to wagon.cash field, not inventory.cash
//   - profiles WITHOUT kit fall through to random `generateNpcInventory`

import { describe, it, expect } from 'vitest';
import { generateTrain } from '../src/lib/game/content/trains';
import { LAUNCH_PROFILES, getBotProfile } from '../src/lib/game/content/bot-profiles';
import { makeRng } from '../src/lib/game/rng';

function findCompanionByName(seedStr: string, displayName: string) {
  for (let i = 0; i < 100; i++) {
    const seed = `${seedStr}-${i}`;
    const t = generateTrain(seed, 30, 'fort_kearny', makeRng(seed), { fresh: false });
    const found = t.companions.find((c) => c.name === displayName);
    if (found) return { wagon: found, train: t, seed };
  }
  return null;
}

describe('#287c → #888a — profile.kit shape', () => {
  it('Sager profile kit includes signature flour + bible + fiddle', () => {
    const sager = getBotProfile('sager-family');
    expect(sager.kit).toBeDefined();
    expect(sager.kit).toMatchObject({ flour: 350, bible: 1, fiddle: 1 });
  });

  it('Joe Meek profile kit is the trapper loadout', () => {
    const meek = getBotProfile('joe-meek');
    expect(meek.kit).toMatchObject({
      flour: 30, gunpowder: 40, jerky: 20, whiskey: 4
    });
  });

  it('Whitman profile kit doubles down on bibles + primer', () => {
    const w = getBotProfile('whitman-mission');
    expect(w.kit).toMatchObject({ bible: 2, primer: 1 });
  });

  it('Donner profile kit ships settler luxury haul', () => {
    const d = getBotProfile('donner-family');
    expect(d.kit).toMatchObject({ flour: 280, china_tea_set: 1, anvil: 1 });
  });

  it('Reed profile kit ships Pioneer Palace luxuries + cash', () => {
    const r = getBotProfile('reed-family');
    expect(r.kit).toMatchObject({
      feather_mattress: 1, china_tea_set: 1, family_bible: 1, cash: 600
    });
  });

  it('Brown / Palmer / Hastings / Bidwell / Meeker still have no curated kit', () => {
    expect(getBotProfile('tabitha-brown').kit).toBeUndefined();
    expect(getBotProfile('joel-palmer').kit).toBeUndefined();
    expect(getBotProfile('lansford-hastings').kit).toBeUndefined();
    expect(getBotProfile('bidwell-party').kit).toBeUndefined();
    expect(getBotProfile('meeker-family').kit).toBeUndefined();
  });
});

describe('#888a — kit applied at wagon-gen time', () => {
  it('Sager wagon ships flour=350 + bible=1 + fiddle=1', () => {
    const found = findCompanionByName('s', 'the Sager family');
    expect(found).not.toBeNull();
    const w = found!.wagon;
    expect(w.inventory.flour).toBe(350);
    expect(w.inventory.bible).toBe(1);
    expect(w.inventory.fiddle).toBe(1);
    // Per-soul gear scaled to the 9-soul family
    expect(w.inventory.coat).toBe(9);
    expect(w.inventory.blanket).toBe(9);
  });

  it('Joe Meek wagon ships trapper kit + hunter profession layer (bullet_mold + 2 lead_pig)', () => {
    const found = findCompanionByName('m', 'Joe Meek');
    expect(found).not.toBeNull();
    const w = found!.wagon;
    // Profile.kit
    expect(w.inventory.flour).toBe(30);
    expect(w.inventory.gunpowder).toBe(40);
    expect(w.inventory.jerky).toBe(20);
    expect(w.inventory.whiskey).toBe(4);
    // Hunter profession layer (post-#890): bullet_mold + 2 lead_pig
    expect(w.inventory.bullet_mold).toBe(1);
    expect(w.inventory.lead_pig).toBe(2);
  });

  it('Reed wagon cash = profile.kit cash 600 + banker profession 1000 = 1600', () => {
    const found = findCompanionByName('r', 'the Reed family');
    expect(found).not.toBeNull();
    const w = found!.wagon;
    expect(w.cash).toBe(1600);
    // `cash` should NOT have leaked into the inventory dict
    expect(w.inventory.cash).toBeUndefined();
  });

  it('Whitman wagon ships kit + doctor profession (medical_books + dovers_powder)', () => {
    const found = findCompanionByName('w', 'the Whitman party');
    expect(found).not.toBeNull();
    const w = found!.wagon;
    expect(w.inventory.bible).toBe(2);
    expect(w.inventory.primer).toBe(1);
    // Doctor profession layer (post-#890)
    expect(w.inventory.medical_books).toBe(1);
    expect(w.inventory.dovers_powder).toBe(4);
  });
});

describe('#888a — random fillers fall through to generateNpcInventory', () => {
  it('non-curated profiles + random fillers still get random flour rolls', () => {
    const flours = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const seed = `r${i}`;
      const t = generateTrain(seed, 30, 'fort_kearny', makeRng(seed), { fresh: false });
      for (const c of t.companions) {
        // Skip the 5 curated profiles
        const curatedNames = LAUNCH_PROFILES
          .filter((p) => p.kit !== undefined)
          .map((p) => p.displayName);
        if (curatedNames.includes(c.name)) continue;
        flours.add(c.inventory.flour ?? 0);
      }
    }
    // Random fillers + non-curated profiles should yield > 5 distinct
    // flour values across 30 trains.
    expect(flours.size).toBeGreaterThan(5);
  });
});
