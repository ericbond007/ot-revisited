import { describe, it, expect } from 'vitest';
import { DEBRIS_CATALOG, hash32, hashFloats, categoryWeights, fortLaramieProgress, LARAMIE_PROGRESS, debrisAt, SLOT_PITCH, SCENE_UNITS_PER_MILE, computeWorldStart } from '../src/lib/ui/wagon/terrain/debris-field';

describe('debris catalog', () => {
  it('has 21 sprites across 4 categories', () => {
    expect(DEBRIS_CATALOG).toHaveLength(21);
    const cats = new Set(DEBRIS_CATALOG.map((s) => s.category));
    expect([...cats].sort()).toEqual(['bones', 'graves', 'junk', 'natural']);
  });
  it('every sprite has a non-empty name and a size class', () => {
    for (const s of DEBRIS_CATALOG) {
      expect(s.name).toMatch(/^[a-z-]+$/);
      expect(['small', 'large']).toContain(s.size);
    }
  });
});

describe('hash', () => {
  it('hash32 is deterministic and uint32', () => {
    expect(hash32(42)).toBe(hash32(42));
    expect(hash32(42)).not.toBe(hash32(43));
    expect(hash32(42)).toBeGreaterThanOrEqual(0);
    expect(hash32(42)).toBeLessThan(2 ** 32);
  });
  it('hashFloats yields k deterministic values in [0,1)', () => {
    const a = hashFloats(7, 8);
    expect(a).toHaveLength(8);
    expect(a).toEqual(hashFloats(7, 8));
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('categoryWeights', () => {
  const base = { terrain: 'prairie' as const, deathCount: 0, laramieProgress: 0.4 };

  it('junk baseline rises from low to high across the trail', () => {
    // Not globally monotone — there is a local Fort-Laramie spike; these
    // three sample points sit clear of it and verify the baseline ramp.
    const a = categoryWeights({ ...base, progress: 0.1 }).junk;
    const b = categoryWeights({ ...base, progress: 0.6 }).junk;
    const c = categoryWeights({ ...base, progress: 0.95 }).junk;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
  it('bones rise from near-zero early to substantial mid-trail', () => {
    expect(categoryWeights({ ...base, progress: 0.05 }).bones).toBeLessThan(0.4);
    expect(categoryWeights({ ...base, progress: 0.6 }).bones).toBeGreaterThan(0.9);
  });
  it('bones weighted up on plains vs forest/mountains', () => {
    const plains = categoryWeights({ ...base, terrain: 'desert', progress: 0.6 }).bones;
    const mtn = categoryWeights({ ...base, terrain: 'mountains', progress: 0.6 }).bones;
    expect(plains).toBeGreaterThan(mtn);
  });
  it('river terrain uses the neutral bone multiplier (baseline)', () => {
    const river = categoryWeights({ ...base, terrain: 'river', progress: 0.6 }).bones;
    const plains = categoryWeights({ ...base, terrain: 'prairie', progress: 0.6 }).bones;
    const mtn = categoryWeights({ ...base, terrain: 'mountains', progress: 0.6 }).bones;
    expect(river).toBeGreaterThan(mtn);   // > 0.6x
    expect(river).toBeLessThan(plains);   // < 1.5x
  });
  it('graves scale with deathCount but stay capped at 0.6', () => {
    const none = categoryWeights({ ...base, progress: 0.5, deathCount: 0 }).graves;
    const some = categoryWeights({ ...base, progress: 0.5, deathCount: 4 }).graves;
    expect(some).toBeGreaterThan(none);
    expect(categoryWeights({ ...base, progress: 1, deathCount: 99 }).graves).toBeLessThanOrEqual(0.6);
  });
  it('junk has a local maximum at the Fort Laramie progress', () => {
    const at = categoryWeights({ ...base, progress: 0.4 }).junk;
    const before = categoryWeights({ ...base, progress: 0.3 }).junk;
    const after = categoryWeights({ ...base, progress: 0.5 }).junk;
    expect(at).toBeGreaterThan(before);
    expect(at).toBeGreaterThan(after);
  });
  it('no spike when laramieProgress is null', () => {
    const w = categoryWeights({ ...base, progress: 0.4, laramieProgress: null });
    expect(w.junk).toBeCloseTo(1.1 * smoothstepRef(0.22, 0.85, 0.4), 5);
  });
});

describe('fortLaramieProgress', () => {
  it("resolves to Fort Laramie's real mid-trail position", () => {
    // Computed from LANDMARKS: cumulative milesFromPrevious through
    // ft_laramie (702) ÷ total (2195) ≈ 0.320. Tight band catches
    // landmark-data / accumulation regressions, not just "some 0..1".
    const p = fortLaramieProgress();
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(0.25);
    expect(p as number).toBeLessThan(0.39);
  });
  it('LARAMIE_PROGRESS is the memoised value', () => {
    // Guards referential stability of the module-load memo; the band
    // test above carries the real value-regression coverage.
    expect(LARAMIE_PROGRESS).toBe(fortLaramieProgress());
  });
});

describe('debrisAt', () => {
  const heavy = { natural: 1, bones: 1, junk: 2, graves: 0.3 };

  it('is deterministic for a slot index', () => {
    expect(debrisAt(123, heavy)).toEqual(debrisAt(123, heavy));
  });
  it('returns null for empty slots and DebrisInstance otherwise', () => {
    let hit = 0;
    for (let i = 0; i < 200; i++) if (debrisAt(i, heavy)) hit++;
    expect(hit).toBeGreaterThan(20);
    expect(hit).toBeLessThan(200);
  });
  it('never emits the rut band: row is only above|below', () => {
    for (let i = 0; i < 500; i++) {
      const d = debrisAt(i, heavy);
      if (d) expect(['above', 'below']).toContain(d.row);
    }
  });
  it('large sprites are always placed below the rut', () => {
    for (let i = 0; i < 500; i++) {
      const d = debrisAt(i, heavy);
      if (d && /wheel|barrel|trunk|stove|bacon|rib-cage|grave/.test(d.sprite)) {
        expect(d.row).toBe('below');
      }
    }
  });
  it('worldX stays within its slot +/- jitter', () => {
    for (let i = 0; i < 200; i++) {
      const d = debrisAt(i, heavy);
      if (d) {
        expect(Math.abs(d.worldX - i * SLOT_PITCH)).toBeLessThanOrEqual(0.4 * SLOT_PITCH + 1e-9);
      }
    }
  });
  it('zero-weight category is never selected', () => {
    const noGraves = { natural: 1, bones: 0, junk: 0, graves: 0 };
    for (let i = 0; i < 400; i++) {
      const d = debrisAt(i, noGraves);
      if (d) expect(d.sprite).toMatch(/pebble|stick|rock|buffalo/);
    }
  });
});

describe('computeWorldStart (#1075 mile anchor)', () => {
  const DEBRIS_SCROLL = 0.6;

  it('at mount (scrollX=0), worldStart is pure function of milesTraveled', () => {
    expect(computeWorldStart(0, 0, DEBRIS_SCROLL)).toBe(0);
    expect(computeWorldStart(100, 0, DEBRIS_SCROLL)).toBe(100 * SCENE_UNITS_PER_MILE);
    expect(computeWorldStart(547.3, 0, DEBRIS_SCROLL)).toBeCloseTo(547.3 * SCENE_UNITS_PER_MILE, 6);
  });

  it('same milesTraveled at mount → same worldStart (mile X looks like mile X)', () => {
    // Two independent "mount moments" at the same trail position must
    // agree, regardless of whether the user got there via remount, save
    // restore, or pause/resume — this is the spec property the original
    // scroll-only formula was failing.
    expect(computeWorldStart(412, 0, DEBRIS_SCROLL))
      .toBe(computeWorldStart(412, 0, DEBRIS_SCROLL));
  });

  it('different milesTraveled at mount → different worldStart (slot identity shifts)', () => {
    const a = computeWorldStart(100, 0, DEBRIS_SCROLL);
    const b = computeWorldStart(101, 0, DEBRIS_SCROLL);
    expect(b - a).toBe(SCENE_UNITS_PER_MILE);
  });

  it('scrollX adds the parallax-locked within-leg drift on top of the mile anchor', () => {
    const anchorOnly = computeWorldStart(50, 0, DEBRIS_SCROLL);
    const withDrift = computeWorldStart(50, -100, DEBRIS_SCROLL);
    expect(withDrift - anchorOnly).toBeCloseTo(-100 * DEBRIS_SCROLL, 6);
  });

  it('mile anchor dominates typical within-leg drift over a day-tick window', () => {
    // ~15 mi advance per day-tick → anchor jump = 15 * SCENE_UNITS_PER_MILE.
    // A real session's scrollX drift between mounts is ~|scrollX|≤~600
    // (10s of animation at 60u/s) → drift term ≤ 360. Anchor jump must
    // exceed that or the spec property dissolves into noise.
    const anchorJump = 15 * SCENE_UNITS_PER_MILE;
    const typicalDrift = Math.abs(-600 * DEBRIS_SCROLL);
    expect(anchorJump).toBeGreaterThan(typicalDrift);
  });
});

function smoothstepRef(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
