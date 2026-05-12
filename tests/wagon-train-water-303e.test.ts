// #303e — NPC water tracking. Tests cover the data shape, generation
// defaults, daily drain, dehydration HP/morale damage, dirty-water
// dysentery roll, train water pool on rest days, and v2→v3 save
// migration for legacy saves missing the water fields.

import { describe, it, expect } from 'vitest';
import { generateTrain } from '../src/lib/game/content/trains';
import { tickNpcWagon, type NpcTickContext } from '../src/lib/game/systems/npc-engine';
import { npcWaterConsumedToday } from '../src/lib/game/systems/npc-water';
import { applyTrainWaterPool, joinTrain } from '../src/lib/game/systems/wagon-train';
import { rest } from '../src/lib/game/actions/rest';
import { createInitialState } from '../src/lib/game/engine';
import { serialize, deserialize } from '../src/lib/game/saves';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'water-test',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function freshTrain(seed = 'fresh') {
  return generateTrain(seed, 1, 'independence_mo', makeRng(seed), { fresh: true });
}

function ctx(over: Partial<NpcTickContext> = {}): NpcTickContext {
  return {
    day: 1,
    traveled: true,
    pace: 'moderate',
    terrain: 'prairie',
    weather: 'clear',
    ...over
  };
}

describe('#303e — NpcWagonState water shape', () => {
  it('generated wagons start with water = waterCap (fresh join)', () => {
    const train = freshTrain();
    for (const c of train.companions) {
      expect(c.waterCap).toBeGreaterThan(0);
      expect(c.water).toBe(c.waterCap);
      expect(c.dirtyWater).toBe(0);
      expect(c.dryDays).toBe(0);
    }
  });

  it('mid-trail join starts wagons partially watered (60-100%)', () => {
    const train = generateTrain('mid', 60, 'ft_kearny', makeRng('mid'));
    for (const c of train.companions) {
      expect(c.water).toBeGreaterThanOrEqual(Math.round(c.waterCap * 0.6));
      expect(c.water).toBeLessThanOrEqual(c.waterCap);
    }
  });
});

describe('#303e — npcWaterConsumedToday', () => {
  it('charges 1 gal per adult under clear weather', () => {
    const wagon = freshTrain().companions[0];
    const adults = wagon.party.filter((m) => !m.dead && m.kind === 'adult').length;
    expect(npcWaterConsumedToday(wagon, 'clear')).toBe(adults
      + Math.ceil(wagon.party.filter((m) => !m.dead && m.kind === 'child').length * 0.7));
  });

  it('doubles consumption on heat days', () => {
    const wagon = freshTrain().companions[0];
    const cool = npcWaterConsumedToday(wagon, 'clear');
    const hot = npcWaterConsumedToday(wagon, 'heat');
    expect(hot).toBe(Math.ceil(cool * 2));
  });

  it('returns 0 for a wiped wagon (no alive eaters)', () => {
    const wagon: NpcWagonState = {
      ...freshTrain().companions[0],
      party: freshTrain().companions[0].party.map((m) => ({ ...m, dead: true }))
    };
    expect(npcWaterConsumedToday(wagon, 'clear')).toBe(0);
  });
});

// #939c — applyNpcWaterDrain + applyNpcDirtyWaterRisk parallel impls
// removed. Water draw + dirty-water disease rolls now run through the
// engine's `applyDailyConsumption` + `applyDirtyWaterRisk` via wagon-
// synth. The end-to-end `tickNpcWagon water integration` describe
// block below + the engine-side consumption test suite cover the same
// behavior.

// #939k — applyNpcDehydration parallel impl removed. NPC dehydration
// now flows through engine `applyDehydration` via wagon-synth; the
// engine-side dehydration test suite covers the dry-day curve.

describe('#303e — tickNpcWagon water integration', () => {
  it('drains keg through normal tick', () => {
    const wagon = freshTrain().companions[0];
    const startWater = wagon.water;
    const draw = npcWaterConsumedToday(wagon, 'clear');
    const result = tickNpcWagon(wagon, ctx(), makeRng('t'));
    expect(result.wagon.water).toBe(startWater - draw);
  });

  it('takes dehydration damage when keg empty', () => {
    const base = freshTrain().companions[0];
    const wagon: NpcWagonState = { ...base, water: 0, dryDays: 1 };
    const moraleBefore = wagon.morale;
    const result = tickNpcWagon(wagon, ctx(), makeRng('t'));
    expect(result.wagon.dryDays).toBe(2);
    expect(result.wagon.morale).toBeLessThan(moraleBefore);
  });
});

describe('#303e — applyTrainWaterPool', () => {
  it('redistributes clean water across in-train wagons proportionally', () => {
    let s = joinTrain(game(), makeRng('pool')).state;
    // Drain one companion's water; player keg starts full.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, water: 0 } : c
        )
      }
    };
    const before = s.wagonTrain!.companions[0].water;
    const pooled = applyTrainWaterPool(s);
    const after = pooled.wagonTrain!.companions[0].water;
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0);
  });

  it('skips wiped companions', () => {
    let s = joinTrain(game(), makeRng('pool-wiped')).state;
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, outcome: 'wiped' as const, water: 99 } : c
        )
      }
    };
    const pooled = applyTrainWaterPool(s);
    // Wiped wagon's water unchanged.
    expect(pooled.wagonTrain!.companions[0].water).toBe(99);
  });

  it('fires on rest days via advanceTrain (integration)', () => {
    let s = joinTrain(game(), makeRng('pool-int')).state;
    // Drain a companion's water to 0 so we can see the share kick in.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, water: 0 } : c
        )
      }
    };
    s = rest(s, 1);
    expect(s.wagonTrain!.companions[0].water).toBeGreaterThan(0);
  });
});

describe('#303e — v2 → v3 save migration', () => {
  it('fills missing water fields on v2 saves with a wagonTrain', () => {
    const s = joinTrain(game(), makeRng('mig')).state;
    // Stage a v2 save by stripping water fields and bumping version down.
    const json = JSON.stringify({
      version: 2,
      state: {
        ...s,
        wagonTrain: {
          ...s.wagonTrain!,
          companions: s.wagonTrain!.companions.map((c) => {
            const { water: _w, dirtyWater: _dw, waterCap: _wc, dryDays: _dd, ...rest } = c;
            return rest;
          })
        }
      }
    });
    const restored = deserialize(json);
    for (const c of restored.wagonTrain!.companions) {
      expect(typeof c.water).toBe('number');
      expect(typeof c.dirtyWater).toBe('number');
      expect(typeof c.waterCap).toBe('number');
      expect(typeof c.dryDays).toBe('number');
      expect(c.water).toBe(c.waterCap);
      expect(c.dirtyWater).toBe(0);
      expect(c.dryDays).toBe(0);
    }
  });

  it('round-trips v3 saves unchanged', () => {
    const s = joinTrain(game(), makeRng('rt')).state;
    const restored = deserialize(serialize(s));
    expect(restored.wagonTrain!.companions[0].water).toBe(
      s.wagonTrain!.companions[0].water
    );
    expect(restored.wagonTrain!.companions[0].waterCap).toBe(
      s.wagonTrain!.companions[0].waterCap
    );
  });
});
