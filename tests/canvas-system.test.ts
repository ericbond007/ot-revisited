import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { tickWeather } from '../src/lib/game/systems/weather';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { tickWagon } from '../src/lib/game/systems/wagon';
import { repairWagon, forgeOxShoes } from '../src/lib/game/systems/town-services';
import { makeRng } from '../src/lib/game/rng';
import {
  canvasRainCatchMult,
  rollCanvasSupplyDamage,
  applyCanvasSupplyDamage
} from '../src/lib/game/systems/canvas';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'canvas-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

describe('wagon.canvas state (#201)', () => {
  it('starts at 100 on a new game', () => {
    expect(newGame().wagon.canvas).toBe(100);
  });

  it('upgradeState defaults canvas to 100 when missing', async () => {
    const { upgradeState } = await import('../src/lib/game/upgrade');
    const s = newGame();
    const legacy = { ...s, wagon: { ...s.wagon } } as GameState;
    delete (legacy.wagon as Partial<typeof legacy.wagon>).canvas;
    const upgraded = upgradeState(legacy);
    expect(upgraded.wagon.canvas).toBe(100);
  });
});

describe('canvas rain-catch scaling', () => {
  it('full above 60', () => {
    expect(canvasRainCatchMult(100)).toBe(1);
    expect(canvasRainCatchMult(60)).toBe(1);
  });
  it('halved 40-59', () => {
    expect(canvasRainCatchMult(50)).toBe(0.5);
  });
  it('quartered 20-39', () => {
    expect(canvasRainCatchMult(30)).toBe(0.25);
  });
  it('zero below 20', () => {
    expect(canvasRainCatchMult(15)).toBe(0);
  });
});

describe('canvas supply damage rolls', () => {
  it('no roll when canvas is sound', () => {
    const s = { ...newGame(), inventory: { flour: 100, gunpowder: 30, percussion_caps: 50 } };
    const r = rollCanvasSupplyDamage(s, 'storm', makeRng('hi'));
    expect(Object.keys(r.losses).length).toBe(0);
    expect(r.hitPowder).toBe(false);
  });

  it('no roll on non-wet weather', () => {
    const s = {
      ...newGame(),
      wagon: { ...newGame().wagon, canvas: 10 },
      inventory: { flour: 100 }
    };
    const r = rollCanvasSupplyDamage(s, 'clear', makeRng('clr'));
    expect(Object.keys(r.losses).length).toBe(0);
  });

  it('storm at canvas<20 hits the heaviest dry good + powder', () => {
    const s = {
      ...newGame(),
      wagon: { ...newGame().wagon, canvas: 15 },
      inventory: { flour: 100, gunpowder: 20, percussion_caps: 40 }
    };
    // 60% chance — try several rng seeds and confirm at least one fires.
    let hit = false;
    for (let i = 0; i < 20; i++) {
      const r = rollCanvasSupplyDamage(s, 'storm', makeRng(`s${i}`));
      if (Object.keys(r.losses).length > 0) {
        hit = true;
        // flour is the heaviest dry good, should be picked.
        expect(r.losses.flour).toBeGreaterThan(0);
        if (r.hitPowder) {
          expect(r.losses.gunpowder ?? r.losses.percussion_caps).toBeGreaterThan(0);
        }
        break;
      }
    }
    expect(hit).toBe(true);
  });

  it('applyCanvasSupplyDamage produces a log line and reduces stock', () => {
    const s = {
      ...newGame(),
      wagon: { ...newGame().wagon, canvas: 15 },
      inventory: { flour: 100, gunpowder: 20 }
    };
    const damage = { losses: { flour: 5, gunpowder: 3 }, hitPowder: true };
    const { state: next, logLine } = applyCanvasSupplyDamage(s, damage);
    expect(next.inventory.flour).toBe(95);
    expect(next.inventory.gunpowder).toBe(17);
    expect(logLine).toContain('powder');
  });
});

describe('camp repair actions', () => {
  it('patch_wagon repairs canvas (not condition)', () => {
    const s = newGame({
      wagon: { ...newGame().wagon, canvas: 80 },
      inventory: { raw_hide: 1 }
    });
    const next = getCampAction('patch_wagon').apply(s, makeRng('p'));
    expect(next.wagon.canvas).toBe(88);
    expect(next.inventory.raw_hide).toBe(0);
  });

  it('replace_canvas swaps full cover (+30 canvas) at 1 spare with toolkit', () => {
    const s = newGame({
      wagon: { ...newGame().wagon, canvas: 50 },
      inventory: { canvas: 2, iron_toolkit: 1 }
    });
    const next = getCampAction('replace_canvas').apply(s, makeRng('rc'));
    expect(next.wagon.canvas).toBe(80);
    expect(next.inventory.canvas).toBe(1);
  });

  it('replace_canvas costs 2 canvas without toolkit', () => {
    const s = newGame({
      wagon: { ...newGame().wagon, canvas: 50 },
      inventory: { canvas: 2 }
    });
    expect(getCampAction('replace_canvas').availability(s).available).toBe(true);
    const next = getCampAction('replace_canvas').apply(s, makeRng('rc2'));
    expect(next.inventory.canvas).toBe(0);
    expect(next.wagon.canvas).toBe(80);
  });

  it('replace_canvas unavailable with 1 canvas + no toolkit', () => {
    const s = newGame({
      wagon: { ...newGame().wagon, canvas: 50 },
      inventory: { canvas: 1 }
    });
    expect(getCampAction('replace_canvas').availability(s).available).toBe(false);
  });

  it('replace_planks bumps frame by 5 with toolkit', () => {
    const s = newGame({
      wagon: { ...newGame().wagon, condition: 80 },
      inventory: { spare_plank: 1, iron_toolkit: 1 }
    });
    const next = getCampAction('replace_planks').apply(s, makeRng('rp'));
    expect(next.wagon.condition).toBe(85);
    expect(next.inventory.spare_plank).toBe(0);
  });

  it('replace_planks costs 2 planks without toolkit', () => {
    const s = newGame({
      wagon: { ...newGame().wagon, condition: 80 },
      inventory: { spare_plank: 2 }
    });
    const next = getCampAction('replace_planks').apply(s, makeRng('rp2'));
    expect(next.inventory.spare_plank).toBe(0);
    expect(next.wagon.condition).toBe(85);
  });
});

describe('tar_bucket effect on tickWagon', () => {
  it('cuts frame decay 25% when present', () => {
    const noTar = newGame({ wagon: { ...newGame().wagon, condition: 100 } });
    const withTar = { ...noTar, inventory: { tar_bucket: 1 } };
    const a = tickWagon(noTar, makeRng('t1'));
    const b = tickWagon(withTar, makeRng('t1'));
    expect(b.wagon.condition).toBeGreaterThan(a.wagon.condition);
  });
});

describe('blacksmith profession town discount', () => {
  it('halves the per-point repair rate', () => {
    const withSmith = newGame({
      cash: 100,
      wagon: { ...newGame().wagon, condition: 50 },
      party: [
        { ...newGame().party[0], profession: 'blacksmith' as const },
        newGame().party[1]
      ]
    });
    const r = repairWagon(withSmith, 20);
    // $20 buys 80 points at $0.25/point — capped by room (50).
    expect(r.pointsRestored).toBe(50);
  });

  it('no discount when Blacksmith is dead', () => {
    const dead = newGame({
      cash: 100,
      wagon: { ...newGame().wagon, condition: 50 },
      party: [
        { ...newGame().party[0], profession: 'blacksmith' as const, dead: true },
        newGame().party[1]
      ]
    });
    const r = repairWagon(dead, 20);
    // $20 / $0.50 = 40 points (no discount).
    expect(r.pointsRestored).toBe(40);
  });
});

describe('forgeOxShoes town action', () => {
  it('mints ox_shoes for cash', () => {
    const s = newGame({ cash: 50, inventory: {} });
    const r = forgeOxShoes(s, 4);
    expect(r.cost).toBe(6);
    expect(r.state.cash).toBe(44);
    expect(r.state.inventory.ox_shoes).toBe(4);
  });

  it('halves cost when Blacksmith is alive', () => {
    const s = newGame({
      cash: 50,
      inventory: {},
      party: [
        { ...newGame().party[0], profession: 'blacksmith' as const },
        newGame().party[1]
      ]
    });
    const r = forgeOxShoes(s, 4);
    expect(r.cost).toBe(3);
    expect(r.state.inventory.ox_shoes).toBe(4);
  });

  it('throws if cash short', () => {
    const s = newGame({ cash: 1, inventory: {} });
    expect(() => forgeOxShoes(s, 10)).toThrow();
  });
});

describe('weather → canvas drain', () => {
  it('storm drains canvas more than rain over many days', () => {
    function avgDrop(weatherForce: 'rain' | 'storm') {
      let total = 0;
      for (let seed = 0; seed < 20; seed++) {
        let s = newGame({ seed: `w${weatherForce}-${seed}` });
        // Force the picker by repeated ticks until canvas drains;
        // tickWeather rolls weather, so we just take whatever shows up
        // and read the canvas change.
        const before = s.wagon.canvas;
        s = tickWeather(s, makeRng('x'));
        if (s.weather === weatherForce) total += before - s.wagon.canvas;
      }
      return total;
    }
    // Loose check: across many tries, storm-day drops sum to more than rain-day drops.
    expect(avgDrop('storm')).toBeGreaterThanOrEqual(avgDrop('rain'));
  });
});
