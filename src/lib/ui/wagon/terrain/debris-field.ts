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
 *  from one seed are not cross-correlated. */
export function hashFloats(seed: number, k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    out.push(hash32(seed ^ Math.imul(i, 2246822519)) / 4294967296);
  }
  return out;
}
