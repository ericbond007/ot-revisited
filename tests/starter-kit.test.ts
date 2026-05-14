import { describe, it, expect } from 'vitest';
import { buildStarterKit, BASE_KIT } from '../src/lib/game/content/starter-kit';

describe('starter kit', () => {
  it('BASE_KIT covers the day-1 essentials', () => {
    expect(BASE_KIT.cash).toBeGreaterThan(0);
    expect(BASE_KIT.oxen).toBeGreaterThanOrEqual(4);
    // Variety in the food spread (#110 varied-diet bonus is reachable
    // without buying anything else).
    expect(BASE_KIT.inventory.flour).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.beans).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.bacon).toBeGreaterThan(0);
    // Day-1 essentials so the brew / cure / triage paths all work
    // regardless of profession picks.
    expect(BASE_KIT.inventory.coffee).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.salt).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.bandages).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.cookware).toBe(1);
    expect(BASE_KIT.inventory.shovel).toBe(1);
    // Bullets removed from BASE — useless without a rifle, and either
    // Hunter or Gunsmith brings one.
    expect(BASE_KIT.inventory.bullets ?? 0).toBe(0);
    // Water skins removed from BASE — wagons declare their own
    // baseWaterCapGal; skins are an outfitter upgrade.
    expect(BASE_KIT.inventory.water_skin ?? 0).toBe(0);
    // Yokes are added per-wagon in buildStarterKit (#107) — no longer
    // a flat constant on BASE_KIT.
  });

  it('BASE_KIT ships the period outfitter package (#888c)', () => {
    // Marcy 1859 floor: rifle + ~30 of each ammo, tent, rope.
    expect(BASE_KIT.inventory.rifle).toBe(1);
    expect(BASE_KIT.inventory.gunpowder).toBe(30);
    expect(BASE_KIT.inventory.lead_balls).toBe(30);
    expect(BASE_KIT.inventory.percussion_caps).toBe(30);
    expect(BASE_KIT.inventory.tent).toBe(1);
    expect(BASE_KIT.inventory.rope).toBe(1);
    // Per-soul gear (coat / blanket / boots) NOT on BASE — added in
    // buildStarterKit when partySize is in scope.
    expect(BASE_KIT.inventory.coat ?? 0).toBe(0);
    expect(BASE_KIT.inventory.blanket ?? 0).toBe(0);
    expect(BASE_KIT.inventory.boots ?? 0).toBe(0);
  });

  it('includeStarterKit=false skips BASE_KIT entirely + refunds $440 (#963)', () => {
    const kit = buildStarterKit(['blacksmith'], 'prairie_schooner', { includeStarterKit: false });
    // BASE staples NOT present
    expect(kit.inventory.flour ?? 0).toBe(0);
    expect(kit.inventory.bacon ?? 0).toBe(0);
    expect(kit.inventory.rifle ?? 0).toBe(0);
    expect(kit.inventory.tent ?? 0).toBe(0);
    expect(kit.inventory.coat ?? 0).toBe(0);
    // Cash baseline + refund (#963 bumped refund 250 → 440 to match
    // the new food-rich BASE_KIT value at Independence prices).
    expect(kit.cash).toBe(BASE_KIT.cash + 440);
    // Profession.starterGear still applied (blacksmith identity)
    expect(kit.inventory.iron_toolkit).toBe(1);
    expect(kit.inventory.ox_shoes).toBe(10);
    // Yokes still added (wagon needs them to move)
    expect(kit.inventory.yoke).toBe(2);
  });

  it('includeStarterKit defaults to true when not specified', () => {
    const a = buildStarterKit(['farmer']);
    const b = buildStarterKit(['farmer'], undefined, { includeStarterKit: true });
    expect(a.cash).toBe(b.cash);
    expect(a.inventory.flour).toBe(b.inventory.flour);
  });

  it('per-soul outfitter pass scales coat/blanket/boots with partySize (#888c)', () => {
    // 1 profession → 1 adult → 1 of each
    const solo = buildStarterKit(['scout']);
    expect(solo.inventory.coat).toBe(1);
    expect(solo.inventory.blanket).toBe(1);
    expect(solo.inventory.boots).toBe(1);
    // 4 professions → 4 adults → 4 of each
    const family = buildStarterKit(['farmer', 'doctor', 'carpenter', 'preacher']);
    expect(family.inventory.coat).toBe(4);
    expect(family.inventory.blanket).toBe(4);
    expect(family.inventory.boots).toBe(4);
    // Edge case: empty professions → still 1 (Math.max guard)
    const noone = buildStarterKit([]);
    expect(noone.inventory.coat).toBe(1);
  });

  it('builds yokes per wagon model', () => {
    const light = buildStarterKit([], 'light');
    const prairie = buildStarterKit([], 'prairie_schooner');
    const heavy = buildStarterKit([], 'heavy');
    expect(light.inventory.yoke).toBe(1);
    expect(prairie.inventory.yoke).toBe(2);
    expect(heavy.inventory.yoke).toBe(3);
  });

  it('does not pre-load wagon spare parts (player buys at outfit)', () => {
    const heavy = buildStarterKit([], 'heavy');
    expect(heavy.inventory.wheel ?? 0).toBe(0);
    expect(heavy.inventory.spare_plank ?? 0).toBe(0);
    expect(heavy.inventory.axle ?? 0).toBe(0);
  });

  it('buildStarterKit stacks profession gear onto base', () => {
    // #890 — farmer no longer ships flour (BASE has 300, no duplicate).
    // Use blacksmith (still has identity gear: iron_toolkit + ox_shoes)
    // to verify the stacking logic.
    const kit = buildStarterKit(['blacksmith']);
    expect(kit.inventory.iron_toolkit).toBe(1);
    expect(kit.inventory.ox_shoes).toBe(10);
    expect(kit.cash).toBe(BASE_KIT.cash);
  });

  it('banker adds starting cash', () => {
    // #276 follow-up — period-realistic banker wealth $1500–3000.
    // BASE $400 + Banker $1000 = $1400 total (was $400 + $600).
    const kit = buildStarterKit(['banker']);
    expect(kit.cash).toBe(BASE_KIT.cash + 1000);
  });

  it('stacks duplicate professions', () => {
    // #890 — farmer no longer ships flour. Use blacksmith — two
    // blacksmiths in the party should double the iron_toolkit + ox_shoes.
    const single = buildStarterKit(['blacksmith']);
    const double = buildStarterKit(['blacksmith', 'blacksmith']);
    expect(double.inventory.iron_toolkit).toBe(single.inventory.iron_toolkit + 1);
    expect(double.inventory.ox_shoes).toBe(single.inventory.ox_shoes + 10);
  });

  it('teamster adds an ox and a yoke', () => {
    // Default wagon (prairie_schooner) gives 2 yokes, teamster adds +1 = 3.
    const kit = buildStarterKit(['teamster']);
    expect(kit.oxen).toBe(BASE_KIT.oxen + 1);
    expect(kit.inventory.yoke).toBe(3);
  });
});
