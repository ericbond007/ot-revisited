import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { TRIBES, tribesAtMile, attitudeLevel, getTribe } from '../src/lib/game/content/tribes';
import {
  getTribeAttitude,
  getTribeAttitudeLevel,
  adjustTribeAttitude,
  willTradeWith,
  hostileEncounterChance
} from '../src/lib/game/systems/tribe-relations';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'tribes',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('tribes catalog', () => {
  it('catalog covers the trail', () => {
    expect(TRIBES.length).toBeGreaterThanOrEqual(8);
    for (const t of TRIBES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.region.fromMile).toBeGreaterThanOrEqual(0);
      expect(t.region.toMile).toBeGreaterThan(t.region.fromMile);
      expect(t.baselineAttitude).toBeGreaterThanOrEqual(0);
      expect(t.baselineAttitude).toBeLessThanOrEqual(100);
    }
  });

  it('Nez Perce are friendly, Cayuse pre-Whitman is neutral, Shoshone are friendly', () => {
    expect(attitudeLevel(getTribe('nez_perce').baselineAttitude)).toBe('friendly');
    // Cayuse baseline is the pre-1847 neutral level — the 1847 newspaper
    // headline drops them −15 to land at the post-Whitman wary state.
    expect(attitudeLevel(getTribe('cayuse').baselineAttitude)).toBe('neutral');
    expect(attitudeLevel(getTribe('shoshone').baselineAttitude)).toBe('friendly');
  });
});

describe('tribesAtMile', () => {
  it('returns Pawnee in the Kansas prairie range', () => {
    const ids = tribesAtMile(200).map((t) => t.id);
    expect(ids).toContain('pawnee');
  });

  it('returns Sioux + Cheyenne in the overlap zone near Laramie', () => {
    const ids = tribesAtMile(600).map((t) => t.id);
    expect(ids).toContain('sioux');
    expect(ids).toContain('cheyenne');
  });

  it('returns Shoshone in the Green River country', () => {
    const ids = tribesAtMile(1050).map((t) => t.id);
    expect(ids).toContain('shoshone');
  });

  it('returns none before the first tribe region', () => {
    expect(tribesAtMile(50)).toHaveLength(0);
  });
});

describe('attitude state', () => {
  it('falls back to baseline when nothing has shifted', () => {
    const s = newGame();
    expect(getTribeAttitude(s, 'shoshone')).toBe(getTribe('shoshone').baselineAttitude);
  });

  it('adjust shifts and persists across further adjusts', () => {
    const s0 = newGame();
    const baseline = getTribe('sioux').baselineAttitude;
    const s1 = adjustTribeAttitude(s0, 'sioux', 10);
    expect(getTribeAttitude(s1, 'sioux')).toBe(baseline + 10);
    const s2 = adjustTribeAttitude(s1, 'sioux', -25);
    expect(getTribeAttitude(s2, 'sioux')).toBe(baseline - 15);
  });

  it('clamps to [0, 100]', () => {
    const s = newGame();
    const hi = adjustTribeAttitude(s, 'nez_perce', 999);
    expect(getTribeAttitude(hi, 'nez_perce')).toBe(100);
    const lo = adjustTribeAttitude(s, 'cayuse', -999);
    expect(getTribeAttitude(lo, 'cayuse')).toBe(0);
  });

  it('each tribe tracks independently', () => {
    const s0 = newGame();
    const s1 = adjustTribeAttitude(s0, 'sioux', 10);
    expect(getTribeAttitude(s1, 'sioux')).not.toBe(getTribe('sioux').baselineAttitude);
    expect(getTribeAttitude(s1, 'pawnee')).toBe(getTribe('pawnee').baselineAttitude);
  });
});

describe('trade + hostility', () => {
  it('hostile tribes refuse trade', () => {
    const s0 = newGame();
    const s1 = adjustTribeAttitude(s0, 'cayuse', -50); // cayuse baseline 35, now ~0
    expect(getTribeAttitudeLevel(s1, 'cayuse')).toBe('hostile');
    expect(willTradeWith(s1, 'cayuse')).toBe(false);
  });

  it('neutral+ tribes accept trade', () => {
    const s = newGame();
    expect(willTradeWith(s, 'shoshone')).toBe(true);
    expect(willTradeWith(s, 'nez_perce')).toBe(true);
  });

  it('hostileEncounterChance inversely tracks attitude', () => {
    const s0 = newGame();
    const friendly = hostileEncounterChance(s0, 'nez_perce');
    const wary = hostileEncounterChance(s0, 'cayuse');
    expect(wary).toBeGreaterThan(friendly);
    expect(friendly).toBeGreaterThanOrEqual(0);
    expect(wary).toBeLessThanOrEqual(1);
  });
});
