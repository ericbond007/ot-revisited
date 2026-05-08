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
    const kit = buildStarterKit(['farmer']);
    expect(kit.inventory.flour).toBe((BASE_KIT.inventory.flour ?? 0) + 100);
    expect(kit.cash).toBe(BASE_KIT.cash);
  });

  it('banker adds starting cash', () => {
    // #276 follow-up — period-realistic banker wealth $1500–3000.
    // BASE $400 + Banker $1000 = $1400 total (was $400 + $600).
    const kit = buildStarterKit(['banker']);
    expect(kit.cash).toBe(BASE_KIT.cash + 1000);
  });

  it('stacks duplicate professions', () => {
    const single = buildStarterKit(['farmer']);
    const double = buildStarterKit(['farmer', 'farmer']);
    expect(double.inventory.flour).toBe(single.inventory.flour + 100);
  });

  it('teamster adds an ox and a yoke', () => {
    // Default wagon (prairie_schooner) gives 2 yokes, teamster adds +1 = 3.
    const kit = buildStarterKit(['teamster']);
    expect(kit.oxen).toBe(BASE_KIT.oxen + 1);
    expect(kit.inventory.yoke).toBe(3);
  });
});
