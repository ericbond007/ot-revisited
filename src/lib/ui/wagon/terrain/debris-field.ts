import type { Terrain } from '$lib/game/types';
import { LANDMARKS } from '$lib/game/content/landmarks';
import { trailProgress } from './trail-progress';

export type DebrisCategory = 'natural' | 'bones' | 'junk' | 'graves';
export type SizeClass = 'small' | 'large';

export interface DebrisSprite {
  /** Matches static/wagon-bg/trail-debris/<name>.webp */
  name: string;
  category: DebrisCategory;
  size: SizeClass;
}

export const DEBRIS_CATALOG: readonly DebrisSprite[] = [
  { name: 'pebble-gray', category: 'natural', size: 'small' },
  { name: 'pebble-tan', category: 'natural', size: 'small' },
  { name: 'pebble-rust', category: 'natural', size: 'small' },
  { name: 'rock-cluster', category: 'natural', size: 'small' },
  { name: 'stick-short', category: 'natural', size: 'small' },
  { name: 'stick-curved', category: 'natural', size: 'small' },
  { name: 'buffalo-chips', category: 'natural', size: 'small' },
  { name: 'bison-skull', category: 'bones', size: 'small' },
  { name: 'pronghorn-skull', category: 'bones', size: 'small' },
  { name: 'rib-cage', category: 'bones', size: 'large' },
  { name: 'ox-skull', category: 'bones', size: 'small' },
  { name: 'long-bones', category: 'bones', size: 'small' },
  { name: 'broken-wheel', category: 'junk', size: 'large' },
  { name: 'discarded-barrel', category: 'junk', size: 'large' },
  { name: 'abandoned-trunk', category: 'junk', size: 'large' },
  { name: 'cook-stove', category: 'junk', size: 'large' },
  { name: 'anvil', category: 'junk', size: 'small' },
  { name: 'bacon-heap', category: 'junk', size: 'large' },
  { name: 'grave-mound', category: 'graves', size: 'large' },
  { name: 'grave-marker', category: 'graves', size: 'large' },
  { name: 'grave-wolfdug', category: 'graves', size: 'large' },
];

/** Deterministic uint32 hash of an integer (lowbias32 finalizer). */
export function hash32(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

/** k decorrelated deterministic floats in [0,1) from a seed. Each
 *  channel is independently hashed (counter mode) so channels drawn
 *  from one seed are not cross-correlated. (Improved over the plan's
 *  initial shared-multiply draft — XOR-counter avoids seed=0 collision
 *  and gives full inter-channel independence.) */
export function hashFloats(seed: number, k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    out.push(hash32(seed ^ Math.imul(i, 2246822519)) / 4294967296);
  }
  return out;
}

export interface FieldInputs {
  progress: number; // 0..1 trail fraction
  terrain: Terrain;
  deathCount: number;
  /** Trail-progress of Fort Laramie, or null → no Camp-Sacrifice spike. */
  laramieProgress: number | null;
}

export interface CategoryWeights {
  natural: number;
  bones: number;
  junk: number;
  graves: number;
}

function smoothstep(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function categoryWeights(inp: FieldInputs): CategoryWeights {
  const { progress: p, terrain, deathCount, laramieProgress } = inp;
  const natural = 1.0;
  // 'river' terrain (landmark crossings only) → neutral 1.0 multiplier:
  // bone scatter at a crossing is the same as baseline.
  const tMul =
    terrain === 'prairie' || terrain === 'desert' ? 1.5
    : terrain === 'forest' || terrain === 'mountains' ? 0.6
    : 1.0;
  const bones = (0.15 + 0.85 * smoothstep(0.12, 0.55, p)) * tMul;
  // Gaussian σ = 0.05 trail-fraction half-width around Fort Laramie:
  const spike =
    laramieProgress == null // == null intentionally also covers undefined
      ? 0
      : 1.6 * Math.exp(-(((p - laramieProgress) / 0.05) ** 2));
  const junk = 1.1 * smoothstep(0.22, 0.85, p) + spike;
  const graves = Math.min(0.6, (0.05 + 0.25 * p) * (1 + 0.15 * deathCount));
  return { natural, bones, junk, graves };
}

/**
 * Cumulative trail-progress of the Fort Laramie landmark (stable id
 * `ft_laramie`). Returns null if the landmark is absent so the
 * Camp-Sacrifice spike degrades gracefully (no spike, no NaN).
 * Exported for tests; downstream code should read LARAMIE_PROGRESS.
 */
export function fortLaramieProgress(): number | null {
  let miles = 0;
  for (const lm of LANDMARKS) {
    miles += lm.milesFromPrevious;
    if (lm.id === 'ft_laramie') return trailProgress(miles);
  }
  return null;
}

/** Memoised — LANDMARKS is static. */
export const LARAMIE_PROGRESS: number | null = fortLaramieProgress();

export interface DebrisInstance {
  sprite: string;             // catalog name → /wagon-bg/trail-debris/<name>.webp
  worldX: number;             // absolute trail x of this instance
  row: 'above' | 'below';     // rut band (560..585 scene-y) is never used
  rowT: number;               // [0,1) position within the chosen band
  size: number;               // base scene-unit size; GroundPainting places it
  rot: number;                // degrees
}

/** Scene-x units between candidate debris slots. */
export const SLOT_PITCH = 26;

export function debrisAt(slotIndex: number, w: CategoryWeights): DebrisInstance | null {
  const f = hashFloats(slotIndex + 1, 8);
  const total = w.natural + w.bones + w.junk + w.graves;
  if (total <= 0) return null;
  // density ~0.4 early → ~0.7 late as more categories activate
  const occ = Math.min(0.7, 0.3 + 0.1 * total);
  if (f[0] >= occ) return null;

  const pick = f[1] * total;
  const cat: DebrisCategory =
      pick < w.natural ? 'natural'
    : pick < w.natural + w.bones ? 'bones'
    : pick < w.natural + w.bones + w.junk ? 'junk'
    : 'graves';

  const pool = DEBRIS_CATALOG.filter((s) => s.category === cat);
  // Defensive: a future catalog edit could leave a weighted category
  // with no sprites — treat as an empty slot rather than crash the
  // per-frame render path on `undefined.size`.
  if (pool.length === 0) return null;
  const sprite = pool[Math.min(pool.length - 1, Math.floor(f[2] * pool.length))];

  const big = sprite.size === 'large';
  const row: 'above' | 'below' = big ? 'below' : f[4] < 0.5 ? 'above' : 'below';
  const rowT = f[5];
  const size = big ? 26 + f[6] * 14 : 14 + f[6] * 10;
  const rot = sprite.category === 'graves' ? 0 : Math.round((f[7] - 0.5) * 50);
  const worldX = slotIndex * SLOT_PITCH + (f[3] - 0.5) * 0.8 * SLOT_PITCH;

  return { sprite: sprite.name, worldX, row, rowT, size, rot };
}
