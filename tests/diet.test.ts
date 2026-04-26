import { describe, it, expect } from 'vitest';
import { applyDietVariety, applyHotDrinks } from '../src/lib/game/systems/diet';
import { applyDailyConsumption, applyDirtyWaterRisk, DIRTY_WATER_DISEASE_CHANCE } from '../src/lib/game/systems/consumption';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'diet',
    leader: { name: 'A', profession: 'carpenter' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 7, day: 15 }
  });
  return { ...s, morale: 50, ...overrides };
}

describe('varied-diet bonus', () => {
  it('+1 morale when the day pulled from 2+ groups', () => {
    // Drawing flour (starch) + bacon (meat) = 2 groups → bonus.
    // Flour stock is sized below the day's need so the loop spills
    // into bacon and both groups register.
    const s = newGame({
      inventory: { flour: 1, bacon: 100 }
    });
    const afterConsume = applyDailyConsumption(s);
    const before = afterConsume.morale;
    const afterDiet = applyDietVariety(afterConsume);
    expect(afterDiet.morale).toBe(before + 1);
  });

  it('no bonus when only one group was drawn', () => {
    const s = newGame({
      inventory: { flour: 100 } // starch only
    });
    const afterConsume = applyDailyConsumption(s);
    const before = afterConsume.morale;
    const afterDiet = applyDietVariety(afterConsume);
    expect(afterDiet.morale).toBe(before);
  });

  it('treats berries + flour as 2 groups (fresh + starch)', () => {
    // Berries draw before flour; ration enough that both register.
    const s = newGame({
      inventory: { flour: 100, berries: 1 }
    });
    const after = applyDietVariety(applyDailyConsumption(s));
    expect(after.morale).toBe(s.morale + 1);
  });

  it('handles an empty pantry without crashing', () => {
    const s = newGame({ inventory: {} });
    const after = applyDietVariety(applyDailyConsumption(s));
    expect(after.morale).toBe(s.morale);
  });
});

describe('hot drinks', () => {
  it('+1 morale per brew-day when coffee is on hand', () => {
    const s = newGame({ inventory: { coffee: 10 } });
    const after = applyHotDrinks(s);
    expect(after.morale).toBe(s.morale + 1);
  });

  it('does nothing without coffee or tea', () => {
    const s = newGame({ inventory: {} });
    const after = applyHotDrinks(s);
    expect(after.morale).toBe(s.morale);
  });

  it('consumes 1 lb of coffee every 5 brew-days', () => {
    let s = newGame({ inventory: { coffee: 5 } });
    // Days 1-4: clock ticks but no consumption
    for (let day = 0; day < 4; day++) s = applyHotDrinks(s);
    expect(s.inventory.coffee).toBe(5);
    // Day 5: consume 1 lb, reset clock
    s = applyHotDrinks(s);
    expect(s.inventory.coffee).toBe(4);
    // Days 6-9: clock ticks again
    for (let day = 0; day < 4; day++) s = applyHotDrinks(s);
    expect(s.inventory.coffee).toBe(4);
    // Day 10: another consumption
    s = applyHotDrinks(s);
    expect(s.inventory.coffee).toBe(3);
  });

  it('prefers coffee over tea when both available', () => {
    let s = newGame({ inventory: { coffee: 10, tea: 10 } });
    for (let day = 0; day < 5; day++) s = applyHotDrinks(s);
    expect(s.inventory.coffee).toBe(9);
    expect(s.inventory.tea).toBe(10);
  });

  it('falls back to tea when coffee is empty', () => {
    let s = newGame({ inventory: { tea: 10 } });
    for (let day = 0; day < 5; day++) s = applyHotDrinks(s);
    expect(s.inventory.tea).toBe(9);
  });

  it('clears the brew clock when supplies run out', () => {
    const s = newGame({
      inventory: {},
      flags: { _hotDrinkClock: 3, hasBoilingKnowledge: false, hadFireLastNight: false }
    });
    const after = applyHotDrinks(s);
    expect(after.flags._hotDrinkClock).toBeUndefined();
  });
});

describe('coffee/tea reduces waterborne disease', () => {
  it('cuts the daily disease chance when present', () => {
    // Force a dirty-water draw, then run the risk roll many times to
    // see how often disease actually fires with vs without coffee.
    const baseFlags = { hasBoilingKnowledge: false, hadFireLastNight: false, _lastDirtyWaterDrawn: 5 };
    const noCoffee = newGame({
      // Use carpenter-only party so no Doctor halving the chance.
      inventory: {},
      flags: baseFlags
    });
    const withCoffee = { ...noCoffee, inventory: { coffee: 1 } };

    let sickNoCoffee = 0;
    let sickWithCoffee = 0;
    for (let i = 0; i < 200; i++) {
      const a = applyDirtyWaterRisk(noCoffee, makeRng(`a:${i}`));
      const b = applyDirtyWaterRisk(withCoffee, makeRng(`a:${i}`));
      if (a.party.some((m) => m.conditions.length > noCoffee.party.find((p) => p.id === m.id)!.conditions.length)) sickNoCoffee++;
      if (b.party.some((m) => m.conditions.length > withCoffee.party.find((p) => p.id === m.id)!.conditions.length)) sickWithCoffee++;
    }
    // Coffee should produce noticeably fewer infections.
    expect(sickWithCoffee).toBeLessThan(sickNoCoffee);
    // And the base chance is meaningful (not zero).
    expect(sickNoCoffee).toBeGreaterThan(0);
    expect(DIRTY_WATER_DISEASE_CHANCE).toBeGreaterThan(0);
  });
});
